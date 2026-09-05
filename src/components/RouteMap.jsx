import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Info, Navigation } from 'lucide-react';
import { DAY_COLORS, formatDuration, getStopDurationMinutes, getVisibleDays } from '../lib/trip.js';

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

function addSchematicLine({ coordinates, color, dayIndex, day, segment, layerGroup }) {
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
  line.bindTooltip(`第 ${dayIndex + 1} 天 · ${day.title}${label} · 示意路线`);
  line.addTo(layerGroup);
  return line;
}

function addRoadLine({ geoJson, color, dayIndex, day, segment, layerGroup }) {
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
  line.bindTooltip(`第 ${dayIndex + 1} 天 · ${day.title}${label} · 道路路线`);
  line.addTo(layerGroup);
  return line;
}

export function RouteMap({ trip, selectedDayId, onDayChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayersRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      preferCanvas: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    routeLayersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
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
    const roadRequests = [];

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

      if (segments.length) {
        segments.forEach((segment) => {
          const coordinates = segment.mode === 'driving'
            ? (segment.waypoints ?? segment.coordinates ?? [])
            : (segment.coordinates ?? segment.waypoints ?? []);
          addCoordinatesToBounds(bounds, coordinates);

          const fallbackLine = addSchematicLine({
            coordinates,
            color,
            dayIndex,
            day,
            segment,
            layerGroup,
          });

          if (segment.mode !== 'driving' || !segment.geometryFile) return;

          const roadRequest = fetch(getGeometryUrl(segment.geometryFile), {
            headers: { Accept: 'application/geo+json, application/json' },
            signal: abortController.signal,
          })
            .then((response) => {
              if (!response.ok) throw new Error('Road geometry unavailable');
              return response.json();
            })
            .then((geoJson) => {
              if (cancelled) return;
              const roadLine = addRoadLine({
                geoJson,
                color,
                dayIndex,
                day,
                segment,
                layerGroup,
              });
              const roadBounds = roadLine.getBounds();
              if (!roadBounds.isValid()) {
                layerGroup.removeLayer(roadLine);
                return;
              }
              if (fallbackLine) layerGroup.removeLayer(fallbackLine);
              bounds.extend(roadBounds);
            })
            .catch(() => {
              // Keep the already-rendered waypoint line as a quiet fallback.
            });

          roadRequests.push(roadRequest);
        });
      } else {
        const geometry = day.route?.geometry ?? [];
        addCoordinatesToBounds(bounds, geometry);
        addSchematicLine({ coordinates: geometry, color, dayIndex, day, layerGroup });
      }

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
    Promise.allSettled(roadRequests).then(() => {
      if (!cancelled) fitVisibleRoutes();
    });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [trip, selectedDayId]);

  return (
    <section className="map-panel" aria-labelledby="route-map-title">
      <div className="section-heading map-heading">
        <div>
          <span className="section-kicker">ROUTE AT A GLANCE</span>
          <h2 id="route-map-title">路线地图</h2>
        </div>
        <span className="map-mode"><Navigation size={15} /> 自驾沿路网 · 其他示意</span>
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
            D{index + 1}
          </button>
        ))}
      </div>

      <div ref={mapContainerRef} className="route-map" aria-label="行程路线交互地图" />

      <div className="map-caption map-legend" aria-label="路线图例">
        <Info size={16} aria-hidden="true" />
        <span className="map-legend-item">
          <i className="map-legend-line map-legend-line-road" aria-hidden="true" />
          实线：沿道路生成的自驾路线
        </span>
        <span className="map-legend-item">
          <i className="map-legend-line map-legend-line-schematic" aria-hidden="true" />
          虚线：非自驾路段或道路数据缺失时的地点间示意
        </span>
        <span className="map-route-disclaimer">
          路径由 <a href="https://project-osrm.org/" target="_blank" rel="noreferrer">OSRM</a>
          {' '}基于 OpenStreetMap 路网预先计算，不含实时路况、施工、季节开放或交通管制；出发当天仍以实时导航与当地交管信息为准。
        </span>
      </div>
    </section>
  );
}
