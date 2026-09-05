import { BedDouble, Clock3, MapPinned, Route } from 'lucide-react';
import { calculateTripMetrics, formatDuration } from '../lib/trip.js';

export function OverviewStats({ trip }) {
  const metrics = calculateTripMetrics(trip);
  const stats = [
    { label: '行程天数', value: `${metrics.dayCount} 天`, context: `${metrics.nightCount} 晚`, icon: BedDouble },
    {
      label: '预计里程',
      value: `${metrics.distanceKm} km`,
      context: metrics.flightDistanceKm ? `地面行驶 · 另飞行约 ${metrics.flightDistanceKm} km` : '全程合计',
      icon: Route,
    },
    { label: '在途时间', value: formatDuration(metrics.travelMinutes), context: '驾驶与移动', icon: Clock3 },
    { label: '游览停靠', value: `${metrics.stopCount} 处`, context: '不含餐饮住宿', icon: MapPinned },
  ];

  return (
    <section className="overview-stats" aria-label="行程概览">
      {stats.map(({ label, value, context, icon: Icon }) => (
        <div className="stat-item" key={label}>
          <span className="stat-icon" aria-hidden="true"><Icon size={20} /></span>
          <div>
            <span className="stat-label">{label}</span>
            <strong>{value}</strong>
            <small>{context}</small>
          </div>
        </div>
      ))}
    </section>
  );
}
