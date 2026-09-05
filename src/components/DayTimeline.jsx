import {
  BedDouble,
  Car,
  ChevronRight,
  CircleDot,
  Flag,
  Landmark,
  MapPin,
  Utensils,
} from 'lucide-react';
import { DAY_COLORS, formatDate, formatDuration, getStopDurationMinutes, getVisibleDays } from '../lib/trip.js';

const KIND_META = {
  departure: { label: '出发', icon: Flag },
  arrival: { label: '抵达', icon: MapPin },
  attraction: { label: '游览', icon: Landmark },
  meal: { label: '餐饮', icon: Utensils },
  lodging: { label: '住宿', icon: BedDouble },
};

function StopItem({ stop, index, color }) {
  const meta = KIND_META[stop.kind] ?? { label: '停靠', icon: CircleDot };
  const Icon = meta.icon;
  const duration = getStopDurationMinutes(stop);

  return (
    <li className="stop-item">
      <div className="stop-time">
        <strong>{stop.arrival}</strong>
        <span>{stop.departureDayOffset ? '次日 ' : ''}{stop.departure}</span>
      </div>
      <div className="timeline-rail" aria-hidden="true">
        <span className="timeline-dot" style={{ '--day-color': color }}>{index + 1}</span>
      </div>
      <div className="stop-content">
        <div className="stop-title-row">
          <h4>{stop.name}</h4>
          <span className="stop-kind"><Icon size={14} /> {meta.label}</span>
        </div>
        <p>{stop.note}</p>
        <span className="duration-label">停留 {formatDuration(duration)}</span>
      </div>
    </li>
  );
}

export function DayTimeline({ trip, selectedDayId, onDayChange }) {
  const visibleDays = getVisibleDays(trip, selectedDayId);

  return (
    <section className="timeline-panel" aria-labelledby="daily-plan-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">DAY BY DAY</span>
          <h2 id="daily-plan-title">逐日安排</h2>
        </div>
        {selectedDayId !== 'all' && (
          <button className="text-button" type="button" onClick={() => onDayChange('all')}>查看全部</button>
        )}
      </div>

      <div className="day-cards">
        {visibleDays.map((day) => {
          const dayIndex = trip.days.findIndex((candidate) => candidate.id === day.id);
          const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
          return (
            <article className="day-card" key={day.id} style={{ '--day-color': color }}>
              <header className="day-card-header">
                <span className="day-number">D{dayIndex + 1}</span>
                <div>
                  <span className="day-date">{formatDate(day.date)}</span>
                  <h3>{day.title}</h3>
                  <p>{day.summary}</p>
                </div>
              </header>

              <div className="day-route-summary">
                <span><Car size={15} /> {day.route?.method ?? '交通待定'}</span>
                <span>{day.route?.distanceKm ?? 0} km</span>
                <span>{formatDuration(day.route?.durationMinutes ?? 0)}</span>
              </div>

              <ol className="stop-list">
                {(day.stops ?? []).map((stop, index) => (
                  <StopItem key={stop.id} stop={stop} index={index} color={color} />
                ))}
              </ol>

              {day.lodging && (
                <footer className="day-lodging">
                  <BedDouble size={18} aria-hidden="true" />
                  <div>
                    <span>今晚住宿 · {day.lodging.status}</span>
                    <strong>{day.lodging.name}</strong>
                    <small>{day.lodging.area} · {day.lodging.rooms} 间房</small>
                  </div>
                  <ChevronRight size={17} aria-hidden="true" />
                </footer>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
