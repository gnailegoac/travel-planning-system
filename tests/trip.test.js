import { describe, expect, it } from 'vitest';
import {
  calculateBudget,
  calculateTripMetrics,
  formatDuration,
  getStopDurationMinutes,
  getTravelerCount,
  validateTrip,
} from '../src/lib/trip.js';

describe('行程时间计算', () => {
  it('计算普通停留时间', () => {
    expect(getStopDurationMinutes({ arrival: '09:15', departure: '10:45' })).toBe(90);
    expect(formatDuration(90)).toBe('1 小时 30 分');
  });

  it('支持跨午夜与次日离店', () => {
    expect(getStopDurationMinutes({ arrival: '23:30', departure: '00:30' })).toBe(60);
    expect(getStopDurationMinutes({ arrival: '17:00', departure: '08:30', departureDayOffset: 1 })).toBe(930);
  });
});

describe('预算计算', () => {
  const trip = {
    currency: 'CNY',
    travelers: { adults: 2, children: 1, seniors: 1 },
    budget: {
      contingencyRate: 0.1,
      items: [
        { id: 'hotel', name: '酒店', category: 'lodging', quantity: 2, unitAmount: 400 },
        { id: 'fuel', name: '油费', category: 'transport', quantity: 1, unitAmount: 600 },
        { id: 'ticket', name: '门票', category: 'tickets', quantity: 4, unitAmount: 100, actualAmount: 360 },
      ],
    },
  };

  it('优先使用实际金额并计算预留与人均', () => {
    const budget = calculateBudget(trip);
    expect(budget.subtotal).toBe(1760);
    expect(budget.contingency).toBe(176);
    expect(budget.total).toBe(1936);
    expect(budget.perPerson).toBe(484);
    expect(budget.categories.find((item) => item.id === 'tickets').amount).toBe(360);
  });

  it('统计出行人数', () => {
    expect(getTravelerCount(trip.travelers)).toBe(4);
  });

  it('未报价项目保持未知而不是按零元计价', () => {
    const budget = calculateBudget({
      travelers: { adults: 2 },
      budget: {
        contingencyRate: 0.1,
        items: [{ id: 'flight', name: '机票', category: 'transport', quantity: 2, unitAmount: null }],
      },
    });
    expect(budget.hasPricedItems).toBe(false);
    expect(budget.unpricedItemCount).toBe(1);
    expect(budget.items[0].projectedAmount).toBeNull();
  });
});

describe('行程指标与校验', () => {
  const validTrip = {
    schemaVersion: 1,
    id: 'test-trip',
    title: '测试行程',
    travelers: { adults: 2 },
    days: [
      {
        id: 'day-1',
        date: '2026-10-01',
        route: { distanceKm: 120, durationMinutes: 150 },
        stops: [
          { id: 'stop-1', name: '起点', kind: 'departure', arrival: '08:00', departure: '08:10', coordinates: [30, 104] },
          { id: 'stop-2', name: '景点', kind: 'attraction', arrival: '10:00', departure: '12:00', coordinates: [31, 103] },
        ],
        lodging: { nights: 1 },
      },
    ],
    budget: { items: [] },
  };

  it('汇总里程、在途时间、游览点与住宿晚数', () => {
    expect(calculateTripMetrics(validTrip)).toEqual({
      dayCount: 1,
      distanceKm: 120,
      flightDistanceKm: 0,
      travelMinutes: 150,
      stopCount: 1,
      nightCount: 1,
    });
  });

  it('接受有效数据并拒绝坏坐标与重复 id', () => {
    expect(validateTrip(validTrip)).toEqual([]);
    const invalid = structuredClone(validTrip);
    invalid.days[0].stops[1].id = 'stop-1';
    invalid.days[0].stops[1].coordinates = [100, 103];
    const errors = validateTrip(invalid);
    expect(errors.some((message) => message.includes('重复的停靠点'))).toBe(true);
    expect(errors.some((message) => message.includes('坐标超出范围'))).toBe(true);
  });

  it('校验关键决策与应变预案的必填字段和唯一 id', () => {
    const invalid = structuredClone(validTrip);
    invalid.keyDecisions = [
      { id: 'same', decision: '提前出发', reason: '避峰', tradeoff: '早起' },
      { id: 'same', decision: '保留机动日', reason: '吸收延误' },
    ];
    invalid.fallbackPlans = [{ id: 'weather', trigger: '道路关闭', action: '取消支线' }];
    const errors = validateTrip(invalid);
    expect(errors.some((message) => message.includes('重复的关键决策 id'))).toBe(true);
    expect(errors.some((message) => message.includes('关键决策缺少'))).toBe(true);
    expect(errors.some((message) => message.includes('应变预案缺少'))).toBe(true);

    const wrongTypes = structuredClone(validTrip);
    wrongTypes.keyDecisions = {};
    wrongTypes.fallbackPlans = 'weather';
    expect(validateTrip(wrongTypes)).toEqual(expect.arrayContaining([
      'keyDecisions 必须为数组',
      'fallbackPlans 必须为数组',
    ]));
  });
});
