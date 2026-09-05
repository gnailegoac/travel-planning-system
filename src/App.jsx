import { useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { loadTrip, loadTripCatalog } from './lib/data.js';
import { TripHeader } from './components/TripHeader.jsx';
import { OverviewStats } from './components/OverviewStats.jsx';
import { RouteMap } from './components/RouteMap.jsx';
import { DayTimeline } from './components/DayTimeline.jsx';
import { LodgingOverview } from './components/LodgingOverview.jsx';
import { BudgetPanel } from './components/BudgetPanel.jsx';

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

export default function App() {
  const { catalog, trip, activeTripId, loading, error, changeTrip } = useTripData();
  const [selectedDayId, setSelectedDayId] = useState('all');

  useEffect(() => {
    if (!trip) return;
    const requestedDay = new URLSearchParams(window.location.search).get('day');
    setSelectedDayId(trip.days.some((day) => day.id === requestedDay) ? requestedDay : 'all');
  }, [trip?.id]);

  function changeDay(dayId) {
    setSelectedDayId(dayId);
    const url = new URL(window.location.href);
    if (dayId === 'all') url.searchParams.delete('day');
    else url.searchParams.set('day', dayId);
    window.history.replaceState({}, '', url);
  }

  if (loading && !trip) return <LoadingState />;
  if (error || !trip || !catalog) return <ErrorState message={error ?? '没有可用行程'} />;

  return (
    <div className="app-shell">
      <TripHeader
        trip={trip}
        catalog={catalog}
        activeTripId={activeTripId}
        onTripChange={changeTrip}
      />
      <main>
        <OverviewStats trip={trip} />
        {trip.notice && (
          <aside className="demo-notice">
            <AlertTriangle size={18} aria-hidden="true" />
            <p><strong>框架预览：</strong>{trip.notice}</p>
          </aside>
        )}

        <div className="planning-workspace">
          <RouteMap trip={trip} selectedDayId={selectedDayId} onDayChange={changeDay} />
          <DayTimeline trip={trip} selectedDayId={selectedDayId} onDayChange={changeDay} />
        </div>

        <LodgingOverview trip={trip} />
        <BudgetPanel trip={trip} />
      </main>
      <footer className="site-footer">
        <span>行程画布 · 数据与页面分离的旅行规划框架</span>
        <span>地图数据 © OpenStreetMap contributors</span>
      </footer>
    </div>
  );
}
