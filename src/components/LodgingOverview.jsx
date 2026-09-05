import { BedDouble, CalendarCheck, MapPin } from 'lucide-react';
import { formatDate } from '../lib/trip.js';

export function LodgingOverview({ trip }) {
  const stays = trip.days
    .map((day, index) => ({ day, index, lodging: day.lodging }))
    .filter((entry) => entry.lodging);

  return (
    <section className="content-section" aria-labelledby="lodging-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">WHERE TO STAY</span>
          <h2 id="lodging-title">每晚住宿</h2>
        </div>
        <span className="section-count">{stays.length} 晚</span>
      </div>
      <div className="lodging-grid">
        {stays.map(({ day, index, lodging }) => (
          <article className="lodging-card" key={day.id}>
            <div className="lodging-topline">
              <span>第 {index + 1} 晚</span>
              <span className="booking-status"><CalendarCheck size={14} /> {lodging.status}</span>
            </div>
            <h3>{lodging.name}</h3>
            <p><MapPin size={15} /> {lodging.area}</p>
            <dl>
              <div>
                <dt>入住</dt>
                <dd>{formatDate(day.date, { weekday: undefined })} {lodging.checkIn}</dd>
              </div>
              <div>
                <dt>次日离店</dt>
                <dd>{lodging.checkOut}</dd>
              </div>
              <div>
                <dt>房间</dt>
                <dd>{lodging.rooms} 间</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
