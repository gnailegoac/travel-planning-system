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
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const bounds = [];
    const visibleDays = getVisibleDays(trip, selectedDayId);

    visibleDays.forEach((day) => {
      const dayIndex = trip.days.findIndex((candidate) => candidate.id === day.id);
      const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
      const geometry = day.route?.geometry ?? [];

      if (geometry.length > 1) {
        L.polyline(geometry, {
          color,
          weight: 4,
          opacity: 0.88,
          dashArray: '9 9',
          lineCap: 'round',
        })
          .bindTooltip(`第 ${dayIndex + 1} 天 · ${day.title} · 示意路线`)
          .addTo(layerGroup);
        bounds.push(...geometry);
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
        bounds.push(stop.coordinates);
      });
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [34, 34], maxZoom: 11 });
    } else {
      map.setView([30.5728, 104.0668], 7);
    }
  }, [trip, selectedDayId]);

  return (
    <section className="map-panel" aria-labelledby="route-map-title">
      <div className="section-heading map-heading">
        <div>
          <span className="section-kicker">ROUTE AT A GLANCE</span>
          <h2 id="route-map-title">路线地图</h2>
        </div>
        <span className="map-mode"><Navigation size={15} /> 地点间示意线</span>
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

      <div className="map-caption">
        <Info size={16} aria-hidden="true" />
        <span>虚线仅连接已录入地点，不代表实际道路；正式行程可替换为道路 GeoJSON。</span>
      </div>
    </section>
  );
}
