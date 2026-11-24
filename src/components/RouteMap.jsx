import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Info, Navigation } from 'lucide-react';
import { DAY_COLORS, formatDuration, getStopDurationMinutes, getVisibleDays } from '../lib/trip.js';
import { attachBasemap } from '../lib/basemap.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getGeometryUrl(geometryFile) {
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${baseUrl}${String(geometryFile).replace(/^\.?\//, '')}`;
}

function addCoordinatesToBounds(bounds, coordinates = []) {
  coordinates.forEach((coordinate) => {
    if (Array.isArray(coordinate) && coordinate.length >= 2) bounds.extend(coordinate);
  });
}

function addFlightLine({ coordinates, color, dayIndex, day, segment, layerGroup }) {
  if (coordinates.length < 2) return null;

  const line = L.polyline(coordinates, {
    className: 'route-line route-line-schematic',
    color,
    weight: 4,
    opacity: 0.78,
    dashArray: '9 9',
    lineCap: 'round',
    lineJoin: 'round',
  });
  const label = segment?.label ? ` · ${segment.label}` : '';
  line.bindTooltip(escapeHtml(`第 ${dayIndex + 1} 天 · ${day.title}${label} · 航班示意`));
  line.addTo(layerGroup);
  return line;
}

function addLandLine({ geoJson, color, dayIndex, day, segment, layerGroup }) {
  const line = L.geoJSON(geoJson, {
    className: 'route-line route-line-road',
    style: {
      color,
      weight: 5,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round',
    },
  });
  const label = segment?.label ? ` · ${segment.label}` : '';
  const routeType = segment.mode === 'train' ? '铁路轨迹' : '陆路规划轨迹';
  line.bindTooltip(escapeHtml(`第 ${dayIndex + 1} 天 · ${day.title}${label} · ${routeType}`));
  line.addTo(layerGroup);
  return line;
}

export function RouteMap({ trip, selectedDayId, onDayChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayersRef = useRef(null);
  const [missingRoutes, setMissingRoutes] = useState(0);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      preferCanvas: true,
    });
    const detachBasemap = attachBasemap(map);
    map.attributionControl.addAttribution(
      '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
    );
    routeLayersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      detachBasemap();
      map.remove();
      mapRef.current = null;
      routeLayersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = routeLayersRef.current;
    if (!map || !layerGroup) return undefined;

    layerGroup.clearLayers();
    const bounds = L.latLngBounds([]);
    const visibleDays = getVisibleDays(trip, selectedDayId);
    const abortController = new AbortController();
    let cancelled = false;
    let missing = 0;
    const routeRequests = [];
    const routeFiles = new Map();
    setMissingRoutes(0);

    const loadRoute = (geometryFile) => {
      if (!routeFiles.has(geometryFile)) {
        const request = fetch(getGeometryUrl(geometryFile), {
          headers: { Accept: 'application/geo+json, application/json' },
          signal: abortController.signal,
        }).then((response) => {
          if (!response.ok) throw new Error('Route geometry unavailable');
          return response.json();
        });
        routeFiles.set(geometryFile, request);
      }
      return routeFiles.get(geometryFile);
    };

    const fitVisibleRoutes = () => {
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [34, 34], maxZoom: 11 });
      } else {
        map.setView([30.5728, 104.0668], 7);
      }
    };

    visibleDays.forEach((day) => {
      const dayIndex = trip.days.findIndex((candidate) => candidate.id === day.id);
      const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
      const segments = day.route?.segments ?? [];

      if (!segments.length && day.route?.geometry?.length) missing += 1;
      segments.forEach((segment) => {
        const coordinates = segment.coordinates ?? segment.waypoints ?? [];
        addCoordinatesToBounds(bounds, coordinates);

        if (segment.mode === 'flight') {
          addFlightLine({ coordinates, color, dayIndex, day, segment, layerGroup });
          return;
        }
        if (!segment.geometryFile) {
          missing += 1;
          return;
        }

        const request = loadRoute(segment.geometryFile).then((geoJson) => {
          if (cancelled) return;
          const line = addLandLine({ geoJson, color, dayIndex, day, segment, layerGroup });
          const routeBounds = line.getBounds();
          if (!routeBounds.isValid()) {
            layerGroup.removeLayer(line);
            throw new Error('Empty route geometry');
          }
          bounds.extend(routeBounds);
        });
        routeRequests.push(request);
      });

      (day.stops ?? []).forEach((stop, stopIndex) => {
        const duration = getStopDurationMinutes(stop);
        const marker = L.marker(stop.coordinates, {
          icon: L.divIcon({
            className: 'route-marker-shell',
            html: `<span class="route-marker" style="--marker-color:${color}"><span>${dayIndex + 1}.${stopIndex + 1}</span></span>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -17],
          }),
          title: stop.name,
        });

        marker.bindPopup(`
          <div class="map-popup">
            <span>第 ${dayIndex + 1} 天 · ${escapeHtml(stop.arrival)}</span>
            <strong>${escapeHtml(stop.name)}</strong>
            <p>${escapeHtml(stop.arrival)} 到达 · ${escapeHtml(stop.departure)} 离开</p>
            <p>停留 ${escapeHtml(formatDuration(duration))}</p>
          </div>
        `);
        marker.addTo(layerGroup);
        bounds.extend(stop.coordinates);
      });
    });

    fitVisibleRoutes();
    setMissingRoutes(missing);
    if (routeRequests.length) {
      Promise.allSettled(routeRequests).then((results) => {
        if (cancelled) return;
        setMissingRoutes(missing + results.filter((result) => result.status === 'rejected').length);
        fitVisibleRoutes();
      });
    }

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [trip, selectedDayId]);

  return (
    <section className="map-panel" aria-labelledby="route-map-title">
      <div className="section-heading map-heading">
        <div>
          <span className="section-kicker">路线总览</span>
          <h2 id="route-map-title">路线地图</h2>
        </div>
        <span className="map-mode"><Navigation size={15} /> 陆路轨迹 · 航班示意</span>
      </div>

      <div className="day-filter" role="group" aria-label="选择地图显示日期">
        <button
          type="button"
          className={selectedDayId === 'all' ? 'active' : ''}
          aria-pressed={selectedDayId === 'all'}
          onClick={() => onDayChange('all')}
        >
          全程
        </button>
        {trip.days.map((day, index) => (
          <button
            type="button"
            key={day.id}
            className={selectedDayId === day.id ? 'active' : ''}
            aria-pressed={selectedDayId === day.id}
            onClick={() => onDayChange(day.id)}
          >
            第{index + 1}天
          </button>
        ))}
      </div>

      <div ref={mapContainerRef} className="route-map" aria-label="行程路线交互地图" />

      <div className="map-caption map-legend" aria-label="路线图例">
        <Info size={16} aria-hidden="true" />
        <span className="map-legend-item">
          <i className="map-legend-line map-legend-line-road" aria-hidden="true" />
          实线：陆路规划轨迹
        </span>
        <span className="map-legend-item">
          <i className="map-legend-line map-legend-line-schematic" aria-hidden="true" />
          虚线：航班示意
        </span>
        <span className="map-route-disclaimer">
          {missingRoutes > 0 && <span role="status">{missingRoutes} 段陆路暂缺轨迹，仅显示地点。 </span>}
          道路与步行线路按 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">开放街图</a>
          {' '}路网规划。<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">反馈路网错误</a>
          {trip.sourceLinks?.filter((source) => source.showOnMap).map(({ label, url }) => (
            <span key={url}>{' '}· <a href={url} target="_blank" rel="noreferrer">{label}</a></span>
          ))}
        </span>
      </div>
    </section>
  );
}
