import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, ArrowUpFromLine, BedDouble, BusFront, Camera, CarFront,
  ChevronDown, ChevronLeft, ChevronRight, CircleDot, Clock3, Compass, Footprints, Landmark,
  Map as MapIcon, MapPin, Pause, Plane, Play, Route, TrainFront, Utensils,
} from 'lucide-react';
import { loadTripGeometries } from '../lib/data.js';
import { buildPlayback, samplePlayback } from '../lib/playback.js';
import { getActivityPhoto } from '../lib/activityPhotos.js';
import { formatDuration } from '../lib/trip.js';
import { JourneyMap } from './JourneyMap.jsx';

const EMPTY_ROUTES = new Map();
const SPEED_OPTIONS = [0.5, 1, 2, 4];
const STOP_TYPES = {
  departure: ['出发', MapPin],
  arrival: ['抵达', MapPin],
  transport: ['交通', Route],
  attraction: ['游览', Landmark],
  meal: ['用餐', Utensils],
  lodging: ['住宿', BedDouble],
};
const TRAVEL_TYPES = {
  driving: ['自驾途中', CarFront],
  taxi: ['乘车途中', CarFront],
  walk: ['步行途中', Footprints],
  shuttle: ['接驳途中', BusFront],
  bus: ['巴士途中', BusFront],
  train: ['铁路途中', TrainFront],
  flight: ['飞行途中', Plane],
};
const ZONE_LABELS = {
  'Asia/Hong_Kong': '香港时间',
  'Asia/Shanghai': '北京时间',
  'Asia/Tokyo': '日本时间',
  'Asia/Kolkata': '印度时间',
};

function shortDate(date) {
  const [, month, day] = (date ?? '').split('-').map(Number);
  return month && day ? `${month}月${day}日` : '';
}

function slashDate(date) {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day}`;
}

function useGeometries(trip) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    loadTripGeometries(trip, controller.signal).then((loaded) => {
      if (!controller.signal.aborted) setResult(loaded);
    });
    return () => controller.abort();
  }, [trip]);
  return result;
}

function ActivityPhoto({ photo }) {
  const [failed, setFailed] = useState(false);
  if (!photo || failed) {
    return (
      <div className="activity-photo-empty">
        <Camera size={23} strokeWidth={1.6} aria-hidden="true" />
        <span>暂无活动配图</span>
      </div>
    );
  }
  return (
    <figure className="activity-photo">
      <img src={photo.src} alt={photo.alt} onError={() => setFailed(true)} decoding="async" />
      <figcaption>
        <span>{photo.caption}</span>
        {photo.sourceUrl && (
          <details className="activity-photo-credit">
            <summary>图源</summary>
            <div>
              <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.credit ?? '原图'}</a>
              {photo.licenseUrl && <> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></>}
              {photo.changes && <span>{photo.changes}</span>}
            </div>
          </details>
        )}
      </figcaption>
    </figure>
  );
}

function ActivityTimes({ sample }) {
  const { stop, kind, fromStop, nextStop } = sample;
  if (kind === 'travel' && fromStop && nextStop) {
    return (
      <dl className="activity-times">
        <div><dt><ArrowUpFromLine size={13} /> 出发</dt><dd>{fromStop.departure}</dd></div>
        <div><dt><ArrowDownToLine size={13} /> 抵达</dt><dd>{nextStop.arrival}</dd></div>
        <div><dt><Clock3 size={13} /> 预计用时</dt><dd>{formatDuration(sample.endMinute - sample.startMinute)}</dd></div>
      </dl>
    );
  }
  if (!stop) return null;
  return (
    <dl className="activity-times">
      <div><dt><ArrowDownToLine size={13} /> 到达</dt><dd>{stop.arrival}</dd></div>
      <div><dt><ArrowUpFromLine size={13} /> 离开</dt><dd>{stop.departureDayOffset ? <small>次日 </small> : null}{stop.departure}</dd></div>
      <div><dt><Clock3 size={13} /> 停留</dt><dd>{formatDuration(sample.plannedDuration)}</dd></div>
    </dl>
  );
}

function ActivityPanel({ trip, sample, upcoming, onSelect }) {
  const panel = useRef(null);
  const travel = sample.kind === 'travel';
  const [type, Icon] = sample.kind === 'rest' ? ['行程间歇', Clock3]
    : travel ? (TRAVEL_TYPES[sample.mode] ?? ['转场途中', Route])
      : (STOP_TYPES[sample.stop?.kind] ?? ['停靠', CircleDot]);
  const photo = getActivityPhoto(trip.id, sample.stop ?? sample.nextStop ?? sample.fromStop);
  const caption = travel && photo && !photo.representative ? { ...photo, caption: `沿途或目的地 · ${photo.caption}` } : photo;
  useLayoutEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [sample.kind, sample.stop?.id, sample.fromStop?.id, sample.nextStop?.id]);
  return (
    <aside className="journey-activity-panel" aria-label="当前行程活动" ref={panel}>
      <div className="activity-panel-head">
        <h2>此刻行程</h2>
        <span className="activity-kind"><Icon size={14} aria-hidden="true" /> {type}</span>
      </div>
      <ActivityPhoto key={photo?.src} photo={caption} />
      <div className="activity-panel-copy">
        <h3 data-testid="activity-name">{sample.name}</h3>
        <ActivityTimes sample={sample} />
        {sample.note && <p className="activity-note" data-testid="activity-note">{sample.note}</p>}
        {sample.stop?.timeStatus && <p className="activity-timing">{sample.stop.timeStatus}</p>}
        {sample.approximate && travel && <p className="activity-timing">位置按行程点估算</p>}
      </div>
      {upcoming.length > 0 && (
        <div className="activity-upcoming">
          <h3>接下来</h3>
          <ol>
            {upcoming.map(({ stop, minute, day }) => (
              <li key={stop.id}>
                <button type="button" onClick={() => onSelect(minute, day.id)}>
                  <time>{stop.arrival}</time>
                  <span>{stop.name}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}

function DayStrip({ ticks, currentId, onSelect }) {
  const strip = useRef(null);
  useEffect(() => {
    const row = strip.current;
    const current = row?.querySelector('[aria-current="date"]');
    if (!current || row.scrollWidth <= row.clientWidth) return;
    const left = current.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + current.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = left - (row.clientWidth - current.offsetWidth) / 2;
    }
  }, [currentId]);
  return (
    <nav className="journey-day-strip" ref={strip} aria-label="跳到指定日期">
      {ticks.map((tick, index) => (
        <button key={tick.dayId} type="button" onClick={() => onSelect(tick.minute, tick.dayId)}
          aria-current={currentId === tick.dayId ? 'date' : undefined}
          aria-label={`第${index + 1}天，${shortDate(tick.date)}，${tick.day.title}`}>
          <span>第 {index + 1} 天</span>
          <small>{slashDate(tick.date)}</small>
        </button>
      ))}
    </nav>
  );
}

function Timeline({ model, sample, playing, speed, onSpeed, onPlay, onSeek, onSelect, range, scope, onScope }) {
  const { min, max } = range;
  const { minute } = sample;
  const progress = max > min ? Math.max(0, Math.min(100, (minute - min) / (max - min) * 100)) : 0;
  let previous;
  for (let index = model.activities.length - 1; index >= 0; index -= 1) {
    const item = model.activities[index];
    if (item.minute < minute - 0.6 && item.minute >= min) {
      previous = item;
      break;
    }
  }
  const next = model.activities.find((item) => item.minute > minute + 0.6 && item.minute <= max);
  const dateTime = `${shortDate(sample.date)} ${sample.time}`;
  const zone = ZONE_LABELS[sample.timeZone] ?? sample.timeZone;
  const marks = scope === 'all' ? model.ticks
    : model.activities.filter((item) => item.day.id === sample.day.id);

  function adjustWithKey(event) {
    const deltas = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -60, PageUp: 60 };
    if (event.key in deltas) {
      event.preventDefault();
      onSeek(minute + deltas[event.key]);
    }
  }

  return (
    <section className="journey-player-controls" aria-label="行程时间轴">
      <div className="playback-toolbar">
        <div className="playback-buttons">
          <button className="step-button" type="button" disabled={!previous} aria-label="上一个活动"
            onClick={() => previous && onSeek(previous.minute)}><ChevronLeft size={20} /></button>
          <button className="play-button" type="button" onClick={onPlay} aria-label={playing ? '暂停播放' : '播放行程'} disabled={max <= min}>
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
            <span>{playing ? '暂停' : '播放'}</span>
          </button>
          <button className="step-button" type="button" disabled={!next} aria-label="下一个活动"
            onClick={() => next && onSeek(next.minute)}><ChevronRight size={20} /></button>
        </div>
        <div className="playback-clock">
          <time data-testid="playback-clock">{dateTime}</time>
          <span>{zone}</span>
        </div>
        <div className="playback-options">
          <div className="time-scope" aria-label="时间轴范围" role="group">
            <button type="button" aria-pressed={scope === 'all'} onClick={() => onScope('all')}>全程</button>
            <button type="button" aria-pressed={scope === 'day'} onClick={() => onScope('day')}>当天</button>
          </div>
          <label className="speed-picker" title="1 倍速为每秒推进 60 分钟">
            <span className="sr-only">播放速度</span>
            <select value={speed} onChange={(event) => onSpeed(Number(event.target.value))}>
              {SPEED_OPTIONS.map((option) => <option key={option} value={option}>{option}×</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
        </div>
      </div>
      <div className="playback-progress" style={{ '--progress': `${progress}%` }}>
        <div className="playback-progress-line" aria-hidden="true">
          {max > min && marks.filter((mark) => mark.minute >= min && mark.minute < max).map((mark) => (
            <i key={mark.dayId ?? mark.stop.id} style={{ left: `${(mark.minute - min) / (max - min) * 100}%` }} />
          ))}
        </div>
        <input type="range" min={min} max={max} step="any" value={Math.max(min, Math.min(minute, max))}
          onChange={(event) => onSeek(event.target.valueAsNumber)} onKeyDown={adjustWithKey}
          aria-label="拖动行程时间" aria-valuetext={`${dateTime} ${zone ?? ''}`} disabled={max <= min} />
      </div>
      <DayStrip ticks={model.ticks} currentId={sample.day.id} onSelect={onSelect} />
    </section>
  );
}

export function JourneyPlayer({ trip, initialDayId, visible }) {
  const loaded = useGeometries(trip);
  const geometries = loaded?.geometries ?? EMPTY_ROUTES;
  const model = useMemo(() => buildPlayback(trip, geometries), [trip, geometries]);
  const start = model.ticks.find((tick) => tick.dayId === initialDayId)?.minute ?? model.minMinute;
  const [minute, setMinute] = useState(start);
  const minuteRef = useRef(start);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [rangeDayId, setRangeDayId] = useState(initialDayId ?? null);
  const [showWholeMap, setShowWholeMap] = useState(false);
  const sample = samplePlayback(model, minute);
  const dayRange = model.ticks.findIndex((tick) => tick.dayId === rangeDayId);
  const range = dayRange >= 0
    ? { min: model.ticks[dayRange].minute, max: (model.ticks[dayRange + 1]?.minute ?? (model.maxMinute + 0.1)) - 0.1 }
    : { min: model.minMinute, max: model.maxMinute };
  const limit = range.max;

  useEffect(() => {
    if (!visible) setPlaying(false);
  }, [visible]);

  useEffect(() => {
    if (!playing || !visible) return undefined;
    let previous = performance.now();
    let frame;
    function tick(timestamp) {
      const next = Math.min(limit, minuteRef.current + Math.min(100, timestamp - previous) * 0.06 * speed);
      previous = timestamp;
      minuteRef.current = next;
      setMinute(next);
      if (next >= limit) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible, speed, limit]);

  function seek(value, bounds = range) {
    const next = Math.max(bounds.min, Math.min(value, bounds.max));
    minuteRef.current = next;
    setMinute(next);
    setPlaying(false);
  }

  function select(value, dayId) {
    if (rangeDayId) setRangeDayId(dayId);
    seek(value, { min: model.minMinute, max: model.maxMinute });
  }

  function togglePlay() {
    if (playing) setPlaying(false);
    else {
      if (minute >= limit - 0.05) seek(range.min);
      setPlaying(true);
    }
  }

  if (!sample) return <p className="journey-unavailable" role="status">这份行程没有可播放的时刻。</p>;

  const upcoming = model.activities.filter((item) => item.minute > sample.minute && item.stop.id !== sample.stop?.id).slice(0, 2);
  const dayIndex = trip.days.findIndex((day) => day.id === sample.day.id);
  const routeSources = trip.sourceLinks?.filter((source) => source.showOnMap) ?? [];

  return (
    <div className="journey-experience">
      <div className="journey-stage">
        <section className="journey-map-frame" aria-label="3D 行程地图">
          <JourneyMap trip={trip} day={showWholeMap ? undefined : sample.day} geometries={geometries}
            position={sample.position} activeStopId={sample.stop?.id} mode={sample.mode}
            moving={playing && (sample.kind === 'travel' || Boolean(sample.mode))}
            onStopSelect={(stop, day) => {
              const item = model.activities.find(({ stop: candidate }) => candidate.id === stop.id);
              if (item) select(item.minute, day.id);
            }} />
          <header className="journey-map-header">
            <span className="journey-map-label"><Compass size={17} aria-hidden="true" /> 3D 行程地图</span>
            <p>{`第 ${dayIndex + 1} 天 · ${sample.day.title}`}</p>
          </header>
          <button className="map-scope-button" type="button" aria-pressed={showWholeMap}
            onClick={() => setShowWholeMap(!showWholeMap)}><MapIcon size={16} aria-hidden="true" /> {showWholeMap ? '返回当天' : '查看全程'}</button>
          {!loaded && <p className="map-load-status" role="status">正在读取路线轨迹…</p>}
          {loaded?.failed.length > 0 && <p className="map-load-status" role="status">部分轨迹暂不可用，已按行程点绘制。</p>}
        </section>
        <ActivityPanel trip={trip} sample={sample} upcoming={upcoming} onSelect={select} />
      </div>
      <Timeline model={model} sample={sample} playing={playing} speed={speed} onSpeed={setSpeed} onPlay={togglePlay}
        onSeek={seek} onSelect={select} range={range} scope={dayRange >= 0 ? 'day' : 'all'}
        onScope={(scope) => setRangeDayId(scope === 'day' ? sample.day.id : null)} />
      {routeSources.length > 0 && (
        <div className="journey-map-sources" aria-label="轨迹来源">
          {routeSources.map(({ label, url }) => <a key={url} href={url} target="_blank" rel="noreferrer">{label}</a>)}
        </div>
      )}
    </div>
  );
}
