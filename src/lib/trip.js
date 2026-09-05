export const CATEGORY_META = {
  transport: { label: '交通', color: '#e76546' },
  lodging: { label: '住宿', color: '#2f7668' },
  food: { label: '餐饮', color: '#d99b38' },
  tickets: { label: '门票', color: '#5f72b6' },
  shopping: { label: '购物', color: '#9a6cae' },
  other: { label: '其他', color: '#73827d' },
};

export const DAY_COLORS = ['#e76546', '#2f7668', '#5f72b6', '#c28a2f', '#8f668f', '#407c95'];

export function getTravelerCount(travelers = {}) {
  return Object.values(travelers).reduce((sum, value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? sum + number : sum;
  }, 0);
}

export function timeToMinutes(time, dayOffset = 0) {
  if (!/^\d{2}:\d{2}$/.test(time ?? '')) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return dayOffset * 1440 + hours * 60 + minutes;
}

export function getStopDurationMinutes(stop) {
  const arrival = timeToMinutes(stop.arrival, 0);
  let departure = timeToMinutes(stop.departure, stop.departureDayOffset ?? 0);
  if (arrival == null || departure == null) return null;
  if (!stop.departureDayOffset && departure < arrival) departure += 1440;
  return departure - arrival;
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  if (minutes === 0) return '即停即走';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} 分钟`;
  if (!remainder) return `${hours} 小时`;
  return `${hours} 小时 ${remainder} 分`;
}

export function formatCurrency(amount, currency = 'CNY') {
  if (!Number.isFinite(amount)) return '待补充';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatDate(dateString, options = {}) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
    ...options,
  }).format(date);
}

export function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '日期待定';
  const format = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  };
  return `${format(startDate)} — ${format(endDate)}`;
}

export function calculateBudget(trip) {
  const items = (trip.budget?.items ?? []).map((item) => {
    const hasUnitEstimate = Number.isFinite(item.unitAmount) && Number.isFinite(item.quantity ?? 1);
    const estimatedAmount = Number.isFinite(item.estimatedAmount)
      ? item.estimatedAmount
      : hasUnitEstimate
        ? (item.quantity ?? 1) * item.unitAmount
        : null;
    const projectedAmount = Number.isFinite(item.actualAmount)
      ? item.actualAmount
      : estimatedAmount;
    return { ...item, estimatedAmount, projectedAmount, isPriced: Number.isFinite(projectedAmount) };
  });

  const pricedItems = items.filter((item) => item.isPriced);
  const unpricedItems = items.filter((item) => !item.isPriced);
  const subtotal = pricedItems.reduce((sum, item) => sum + item.projectedAmount, 0);
  const contingencyRate = Number(trip.budget?.contingencyRate) || 0;
  const contingency = Math.round(subtotal * contingencyRate);
  const total = subtotal + contingency;
  const travelerCount = getTravelerCount(trip.travelers);

  const categories = Object.entries(
    pricedItems.reduce((grouped, item) => {
      grouped[item.category] = (grouped[item.category] ?? 0) + item.projectedAmount;
      return grouped;
    }, {}),
  )
    .map(([id, amount]) => ({
      id,
      label: CATEGORY_META[id]?.label ?? id,
      color: CATEGORY_META[id]?.color ?? CATEGORY_META.other.color,
      amount,
      share: subtotal > 0 ? amount / subtotal : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    items,
    subtotal,
    contingencyRate,
    contingency,
    total,
    hasPricedItems: pricedItems.length > 0,
    pricedItemCount: pricedItems.length,
    unpricedItemCount: unpricedItems.length,
    travelerCount,
    perPerson: travelerCount ? total / travelerCount : total,
    categories,
  };
}

export function calculateTripMetrics(trip) {
  const days = trip.days ?? [];
  const distanceKm = days.reduce((sum, day) => sum + (Number(day.route?.distanceKm) || 0), 0);
  const flightDistanceKm = days.reduce(
    (sum, day) => sum + (Number(day.route?.flightDistanceKm) || 0),
    0,
  );
  const travelMinutes = days.reduce(
    (sum, day) => sum + (Number(day.route?.durationMinutes) || 0),
    0,
  );
  const stopCount = days.reduce(
    (sum, day) => sum + (day.stops ?? []).filter((stop) => stop.kind === 'attraction').length,
    0,
  );
  const nightCount = days.reduce((sum, day) => sum + (Number(day.lodging?.nights) || 0), 0);

  return {
    dayCount: days.length,
    distanceKm,
    flightDistanceKm,
    travelMinutes,
    stopCount,
    nightCount,
  };
}

export function validateTrip(trip) {
  const errors = [];
  if (!trip || typeof trip !== 'object') return ['行程数据不是有效对象'];
  if (trip.schemaVersion !== 1) errors.push('schemaVersion 必须为 1');
  if (!trip.id) errors.push('缺少行程 id');
  if (!trip.title) errors.push('缺少行程标题');
  if (!Array.isArray(trip.days) || !trip.days.length) errors.push('至少需要一个行程日');

  const dayIds = new Set();
  const stopIds = new Set();
  for (const [dayIndex, day] of (trip.days ?? []).entries()) {
    const prefix = `第 ${dayIndex + 1} 天`;
    if (!day.id) errors.push(`${prefix} 缺少 id`);
    if (dayIds.has(day.id)) errors.push(`重复的日期 id：${day.id}`);
    dayIds.add(day.id);
    if (!day.date) errors.push(`${prefix} 缺少日期`);
    if (!Array.isArray(day.stops) || !day.stops.length) errors.push(`${prefix} 至少需要一个停靠点`);
    for (const stop of day.stops ?? []) {
      if (!stop.id) errors.push(`${prefix} 有停靠点缺少 id`);
      if (stopIds.has(stop.id)) errors.push(`重复的停靠点 id：${stop.id}`);
      stopIds.add(stop.id);
      if (!stop.name) errors.push(`${prefix} 有停靠点缺少名称`);
      if (!Array.isArray(stop.coordinates) || stop.coordinates.length !== 2) {
        errors.push(`${stop.name ?? prefix} 缺少 [纬度, 经度] 坐标`);
      } else {
        const [lat, lng] = stop.coordinates;
        if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
          errors.push(`${stop.name ?? prefix} 的坐标超出范围`);
        }
      }
      const duration = getStopDurationMinutes(stop);
      if (duration == null) errors.push(`${stop.name ?? prefix} 的到达或离开时间格式错误`);
      if (duration != null && duration < 0) errors.push(`${stop.name ?? prefix} 的离开时间早于到达时间`);
    }
  }

  for (const item of trip.budget?.items ?? []) {
    const quantity = Number(item.quantity ?? 1);
    if (!item.id || !item.name || !item.category) errors.push('预算项缺少 id、name 或 category');
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push(`${item.name ?? '预算项'} 的数量不是有效非负数`);
    }
    for (const field of ['unitAmount', 'estimatedAmount', 'actualAmount']) {
      if (item[field] != null && (!Number.isFinite(item[field]) || item[field] < 0)) {
        errors.push(`${item.name ?? '预算项'} 的 ${field} 不是有效非负数`);
      }
    }
    if (item.dayId && !dayIds.has(item.dayId)) errors.push(`${item.name} 引用了不存在的 dayId：${item.dayId}`);
  }

  return errors;
}

export function getVisibleDays(trip, selectedDayId) {
  if (selectedDayId === 'all') return trip.days ?? [];
  return (trip.days ?? []).filter((day) => day.id === selectedDayId);
}
