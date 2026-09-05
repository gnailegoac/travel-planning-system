import { CarFront, CheckCircle2, CloudSun, ExternalLink, FileBadge2 } from 'lucide-react';

const ICONS = {
  documents: FileBadge2,
  transport: CarFront,
  safety: CloudSun,
};

export function PreparationPanel({ trip }) {
  if (!trip.preparation?.length && !trip.sourceLinks?.length) return null;

  return (
    <section className="content-section" aria-labelledby="preparation-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">BEFORE YOU GO</span>
          <h2 id="preparation-title">出发前待办</h2>
        </div>
        <span className="section-count">以临行前公告为准</span>
      </div>

      <div className="preparation-grid">
        {(trip.preparation ?? []).map((group) => {
          const Icon = ICONS[group.kind] ?? CheckCircle2;
          return (
            <article className="preparation-card" key={group.title}>
              <span className="preparation-icon"><Icon size={20} /></span>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          );
        })}
      </div>

      {trip.sourceLinks?.length > 0 && (
        <details className="source-details">
          <summary>查看这份行程引用的官方信息源</summary>
          <ul>
            {trip.sourceLinks.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label} <ExternalLink size={13} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
