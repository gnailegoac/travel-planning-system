import {
  ArrowRight,
  ChevronDown,
  GitBranch,
  Scale,
  ShieldCheck,
  Siren,
} from 'lucide-react';

function ItemCount({ decisionCount, fallbackCount }) {
  const labels = [];
  if (decisionCount) labels.push(`${decisionCount} 项决策`);
  if (fallbackCount) labels.push(`${fallbackCount} 个预案`);
  return <span className="section-count">{labels.join(' · ')}</span>;
}

export function DecisionSupportPanel({ trip }) {
  const decisions = Array.isArray(trip.keyDecisions) ? trip.keyDecisions : [];
  const fallbackPlans = Array.isArray(trip.fallbackPlans) ? trip.fallbackPlans : [];

  if (!decisions.length && !fallbackPlans.length) return null;

  return (
    <section className="content-section planning-notes-section" aria-labelledby="planning-notes-title">
      <div className="section-heading planning-notes-heading">
        <div>
          <span className="section-kicker">PLAN LOGIC</span>
          <h2 id="planning-notes-title">行程决策与应变</h2>
        </div>
        <ItemCount decisionCount={decisions.length} fallbackCount={fallbackPlans.length} />
      </div>

      <p className="planning-notes-intro">
        把路线背后的取舍和触发式预案放在一起；临行前按最新天气、道路和景区公告复核。
      </p>

      <div className="planning-notes-grid">
        {decisions.length > 0 && (
          <section className="planning-notes-column decision-column" aria-labelledby="key-decisions-title">
            <header className="planning-column-heading">
              <span className="planning-column-icon"><GitBranch size={20} /></span>
              <div>
                <h3 id="key-decisions-title">为什么这样安排</h3>
                <p>展开查看每项选择的依据和代价</p>
              </div>
            </header>

            <div className="planning-note-list">
              {decisions.map((item, index) => (
                <details className="planning-note-card decision-note" key={item.id ?? item.decision ?? index} open={index === 0}>
                  <summary>
                    <span className="planning-note-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="planning-note-title">{item.decision}</span>
                    <ChevronDown className="planning-note-chevron" size={17} aria-hidden="true" />
                  </summary>
                  <div className="planning-note-body">
                    {item.reason && (
                      <div className="planning-note-copy">
                        <span>安排依据</span>
                        <p>{item.reason}</p>
                      </div>
                    )}
                    {item.tradeoff && (
                      <aside className="planning-note-callout decision-tradeoff">
                        <Scale size={16} aria-hidden="true" />
                        <div>
                          <span>需要接受的取舍</span>
                          <p>{item.tradeoff}</p>
                        </div>
                      </aside>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {fallbackPlans.length > 0 && (
          <section className="planning-notes-column fallback-column" aria-labelledby="fallback-plans-title">
            <header className="planning-column-heading">
              <span className="planning-column-icon"><ShieldCheck size={20} /></span>
              <div>
                <h3 id="fallback-plans-title">遇到变化怎么调整</h3>
                <p>按触发条件执行，不在现场临时冒险</p>
              </div>
            </header>

            <div className="planning-note-list">
              {fallbackPlans.map((item, index) => (
                <details className="planning-note-card fallback-note" key={item.id ?? item.trigger ?? index} open={index === 0}>
                  <summary>
                    <span className="planning-note-index"><Siren size={15} aria-hidden="true" /></span>
                    <span className="planning-note-title">{item.trigger}</span>
                    <ChevronDown className="planning-note-chevron" size={17} aria-hidden="true" />
                  </summary>
                  <div className="planning-note-body">
                    {item.action && (
                      <div className="fallback-action">
                        <ArrowRight size={16} aria-hidden="true" />
                        <div>
                          <span>调整方案</span>
                          <p>{item.action}</p>
                        </div>
                      </div>
                    )}
                    {item.priority && (
                      <aside className="planning-note-callout fallback-priority">
                        <ShieldCheck size={16} aria-hidden="true" />
                        <div>
                          <span>优先级</span>
                          <p>{item.priority}</p>
                        </div>
                      </aside>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
