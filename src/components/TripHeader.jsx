import { CalendarDays, Compass, MapPin, Users } from 'lucide-react';
import { formatDateRange, getTravelerCount } from '../lib/trip.js';

export function TripHeader({ trip, catalog, activeTripId, onTripChange }) {
  const travelerCount = getTravelerCount(trip.travelers);

  return (
    <header className="trip-hero">
      <nav className="hero-nav" aria-label="行程画布">
        <a className="brand" href="./" aria-label="行程画布首页">
          <span className="brand-mark" aria-hidden="true"><Compass size={19} /></span>
          <span>行程画布</span>
        </a>
        {catalog.trips.length > 1 && (
          <label className="trip-picker">
            <span>切换行程</span>
            <select value={activeTripId} onChange={(event) => onTripChange(event.target.value)}>
              {catalog.trips.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.title}</option>
              ))}
            </select>
          </label>
        )}
      </nav>

      <div className="hero-content">
        <div className="hero-copy">
          <div className="eyebrow-row">
            <span className="status-pill">{trip.statusLabel ?? trip.status}</span>
            {(trip.tags ?? []).map((tag) => <span className="hero-tag" key={tag}>{tag}</span>)}
          </div>
          <h1>{trip.title}</h1>
          <p>{trip.subtitle}</p>
        </div>

        <dl className="hero-facts">
          <div>
            <dt><CalendarDays size={17} /> 日期</dt>
            <dd>{formatDateRange(trip.startDate, trip.endDate)}</dd>
          </div>
          <div>
            <dt><MapPin size={17} /> 路线</dt>
            <dd>{trip.origin} → {trip.destination}</dd>
          </div>
          <div>
            <dt><Users size={17} /> 出行人数</dt>
            <dd>{travelerCount} 人</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
