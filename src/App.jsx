import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, Clapperboard, Layers3, List, LoaderCircle, MapPin, Users } from 'lucide-react';
import { loadTrip, loadTripCatalog } from './lib/data.js';
import { formatDateRange, getTravelerCount } from './lib/trip.js';
import { OverviewStats } from './components/OverviewStats.jsx';
import { JourneyPlayer } from './components/JourneyPlayer.jsx';
import { DayTimeline } from './components/DayTimeline.jsx';
import { LodgingOverview } from './components/LodgingOverview.jsx';
import { BudgetPanel } from './components/BudgetPanel.jsx';
import { PreparationPanel } from './components/PreparationPanel.jsx';
import { DecisionSupportPanel } from './components/DecisionSupportPanel.jsx';
import './journey.css';

function useTripData() {
  const [catalog, setCatalog] = useState(null);
  const [trip, setTrip] = useState(null);
  const [activeTripId, setActiveTripId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const nextCatalog = await loadTripCatalog();
        const requestedId = new URLSearchParams(window.location.search).get('trip');
        const initialEntry = nextCatalog.trips.find((entry) => entry.id === requestedId)
          ?? nextCatalog.trips.find((entry) => entry.id === nextCatalog.defaultTripId)
          ?? nextCatalog.trips[0];
        if (!initialEntry) throw new Error('行程目录中还没有可显示的行程');
        const nextTrip = await loadTrip(initialEntry);
        if (!cancelled) {
          setCatalog(nextCatalog);
          setActiveTripId(initialEntry.id);
          setTrip(nextTrip);
          setLoading(false);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : '行程加载失败');
          setLoading(false);
        }
      }
    }
    initialize();
    return () => { cancelled = true; };
  }, []);

  async function changeTrip(id) {
    const entry = catalog.trips.find((candidate) => candidate.id === id);
    if (!entry) return;
    setLoading(true);
    setError(null);
    try {
      const nextTrip = await loadTrip(entry);
      setTrip(nextTrip);
      setActiveTripId(id);
      const url = new URL(window.location.href);
      url.searchParams.set('trip', id);
      url.searchParams.delete('day');
      window.history.replaceState({}, '', url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '行程加载失败');
    } finally {
      setLoading(false);
    }
  }

  return { catalog, trip, activeTripId, loading, error, changeTrip };
}

function LoadingState() {
  return (
    <main className="center-state" aria-live="polite">
      <LoaderCircle className="spin" size={28} />
      <p>正在展开行程画布…</p>
    </main>
  );
}

function ErrorState({ message }) {
  return (
    <main className="center-state error-state" role="alert">
      <AlertTriangle size={30} />
      <h1>暂时无法显示行程</h1>
      <p>{message}</p>
    </main>
  );
}

function TripNavigation({ catalog, activeTripId, loading, onTripChange, view, onViewChange }) {
  return (
    <header className="journey-navigation">
      <div className="journey-nav-inner">
        <a className="journey-brand" href="./">
          <span className="journey-brand-mark"><Layers3 size={21} strokeWidth={1.8} aria-hidden="true" /></span>
          行程画布
        </a>
        <nav className="journey-view-nav" aria-label="行程视图">
          <button type="button" aria-pressed={view === 'player'} onClick={() => onViewChange('player')}>
            <Clapperboard size={16} aria-hidden="true" /> 行程播放
          </button>
          <button type="button" aria-pressed={view === 'details'} onClick={() => onViewChange('details')}>
            <List size={17} aria-hidden="true" /> 行程明细
          </button>
        </nav>
        {catalog.trips.length > 1 && (
          <label className="journey-trip-picker">
            <MapPin size={16} aria-hidden="true" />
            <span className="sr-only">切换行程</span>
            <select disabled={loading} value={activeTripId} onChange={(event) => onTripChange(event.target.value)}>
              {catalog.trips.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.title}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </header>
  );
}

function TripExperience({ trip, view }) {
  const [initialDayId] = useState(() => new URLSearchParams(window.location.search).get('day'));
  const [selectedDayId, setSelectedDayId] = useState(() =>
    trip.days.some((day) => day.id === initialDayId) ? initialDayId : 'all',
  );

  function changeDay(dayId) {
    setSelectedDayId(dayId);
    const url = new URL(window.location.href);
    if (dayId === 'all') url.searchParams.delete('day');
    else url.searchParams.set('day', dayId);
    window.history.replaceState({}, '', url);
  }

  return (
    <main className="journey-main">
      <section className="journey-heading" aria-labelledby="journey-title">
        <div>
          <p className="journey-date"><CalendarDays size={16} aria-hidden="true" /> {formatDateRange(trip.startDate, trip.endDate)}</p>
          <h1 id="journey-title">{trip.title}</h1>
          {trip.subtitle && <p className="journey-subtitle">{trip.subtitle}</p>}
        </div>
        <span className="journey-party">
          <Users size={17} aria-hidden="true" /> {getTravelerCount(trip.travelers)} 人
          <span aria-hidden="true">·</span> {trip.days.length} 天
        </span>
      </section>
      <div hidden={view !== 'player'}>
        <JourneyPlayer trip={trip} initialDayId={initialDayId} visible={view === 'player'} />
      </div>
      <div className="journey-details" hidden={view !== 'details'}>
        <div className="journey-detail-meta">
          <span>{trip.statusLabel ?? trip.status}</span>
          <span>{trip.origin} → {trip.destination}</span>
        </div>
        <OverviewStats trip={trip} />
        {trip.notice && (
          <aside className="demo-notice">
            <AlertTriangle size={18} aria-hidden="true" />
            <p><strong>{trip.status === 'demo' ? '框架预览：' : '重要提醒：'}</strong>{trip.notice}</p>
          </aside>
        )}

        <div className="journey-detail-timeline">
          <label className="journey-detail-filter">
            <span>查看日期</span>
            <select value={selectedDayId} onChange={(event) => changeDay(event.target.value)}>
              <option value="all">全部日期</option>
              {trip.days.map((day, index) => (
                <option key={day.id} value={day.id}>第 {index + 1} 天 · {day.date}</option>
              ))}
            </select>
          </label>
          <DayTimeline trip={trip} selectedDayId={selectedDayId} onDayChange={changeDay} />
        </div>

        <DecisionSupportPanel trip={trip} />
        <LodgingOverview trip={trip} />
        <PreparationPanel trip={trip} />
        <BudgetPanel trip={trip} />
      </div>
    </main>
  );
}

export default function App() {
  const { catalog, trip, activeTripId, loading, error, changeTrip } = useTripData();
  const [view, setView] = useState(() =>
    new URLSearchParams(window.location.search).get('view') === 'details' ? 'details' : 'player',
  );

  function changeView(next) {
    setView(next);
    const url = new URL(window.location.href);
    if (next === 'details') url.searchParams.set('view', next);
    else url.searchParams.delete('view');
    window.history.replaceState({}, '', url);
  }

  if (loading && !trip) return <LoadingState />;
  if (error || !trip || !catalog) return <ErrorState message={error ?? '没有可用行程'} />;

  return (
    <div className="app-shell journey-app">
      <TripNavigation catalog={catalog} activeTripId={activeTripId} loading={loading}
        onTripChange={changeTrip} view={view} onViewChange={changeView} />
      <TripExperience key={trip.id} trip={trip} view={view} />
    </div>
  );
}
