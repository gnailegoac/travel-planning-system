import L from 'leaflet';
import './basemap.css';

const attribution = '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>';
const assetUrl = import.meta.env.BASE_URL + 'data/basemap/world.geojson';

function drawPlaces(map, placeLayer, places) {
  placeLayer.clearLayers();
  const zoom = map.getZoom();
  const bounds = map.getBounds();
  const size = map.getSize();
  const visible = [];
  for (const place of places) {
    if (zoom < place.minZoom || !bounds.contains(place.location)) continue;
    const point = map.latLngToContainerPoint(place.location);
    const labelWidth = Math.min(145, 15 + place.name.length * 12);
    if (point.x < 8 || point.x + labelWidth > size.x - 8 || point.y < 12 || point.y > size.y - 12) continue;
    if (visible.some(label => (
      Math.abs(label.y - point.y) < 20
      && point.x < label.x + label.width + 10
      && point.x + labelWidth + 10 > label.x
    ))) continue;

    visible.push({ x: point.x, y: point.y, width: labelWidth });
    const text = document.createElement('span');
    text.textContent = place.name;
    L.marker(place.location, {
      pane: 'localBasemapPlaces',
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: 'basemap-place',
        html: text,
        iconSize: [0, 15],
        iconAnchor: [0, 7],
      }),
    }).addTo(placeLayer);
  }
}

export function attachBasemap(map) {
  const container = map.getContainer();
  container.classList.add('has-local-basemap');
  container.dataset.basemap = 'loading';

  map.createPane('localBasemap').style.zIndex = '199';
  map.createPane('localBasemapPlaces').style.zIndex = '350';
  const renderer = L.canvas({ pane: 'localBasemap', padding: 0.15 });
  const placeLayer = L.layerGroup().addTo(map);
  const controller = new AbortController();
  const failure = L.control({ position: 'bottomleft' });
  failure.onAdd = () => {
    const message = L.DomUtil.create('span', 'basemap-status');
    message.textContent = '底图暂不可用';
    return message;
  };
  let geometryLayer;
  let places = [];
  const renderPlaces = () => drawPlaces(map, placeLayer, places);

  map.attributionControl?.addAttribution(attribution);
  fetch(assetUrl, { signal: controller.signal })
    .then(response => {
      if (!response.ok) throw new Error('Basemap HTTP ' + response.status);
      return response.json();
    })
    .then(data => {
      if (controller.signal.aborted) return;
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid basemap');

      geometryLayer = L.geoJSON(data, {
        filter: ({ geometry }) => geometry.type === 'MultiPolygon',
        pane: 'localBasemap',
        renderer,
        interactive: false,
        style: ({ properties }) => properties.layer === 'lake'
          ? { color: '#b2cad0', fillColor: '#d2e3e7', fillOpacity: 1, weight: 0.5 }
          : { stroke: false, fillColor: '#edf0e4', fillOpacity: 1 },
      }).addTo(map);

      places = data.features
        .filter(({ geometry }) => geometry.type === 'Point')
        .map(({ geometry, properties }) => ({
          ...properties,
          location: L.GeoJSON.coordsToLatLng(geometry.coordinates),
        }))
        .sort((a, b) => a.minZoom - b.minZoom || b.population - a.population);
      map.on('moveend', renderPlaces);
      map.whenReady(renderPlaces);
      container.dataset.basemap = 'ready';
    })
    .catch(() => {
      if (!controller.signal.aborted) {
        container.dataset.basemap = 'unavailable';
        failure.addTo(map);
      }
    });

  return () => {
    controller.abort();
    map.off('load moveend', renderPlaces);
    failure.remove();
    geometryLayer?.remove();
    placeLayer.remove();
    renderer.remove();
    map.attributionControl?.removeAttribution(attribution);
    container.classList.remove('has-local-basemap');
    delete container.dataset.basemap;
  };
}
