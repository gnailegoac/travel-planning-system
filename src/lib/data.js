import { validateTrip } from './trip.js';

const dataBaseUrl = `${import.meta.env.BASE_URL}data/trips/`;

async function fetchJson(url, signal) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error(`数据请求失败（HTTP ${response.status}）`);
  return response.json();
}

export async function loadTripCatalog() {
  const catalog = await fetchJson(`${dataBaseUrl}index.json`);
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.trips)) {
    throw new Error('行程目录格式不正确');
  }
  return catalog;
}

export async function loadTrip(entry) {
  const trip = await fetchJson(`${dataBaseUrl}${entry.file}`);
  const errors = validateTrip(trip);
  if (errors.length) throw new Error(`行程数据校验失败：${errors.join('；')}`);
  return trip;
}

export async function loadTripGeometries(trip, signal) {
  const files = new Set(trip.days.flatMap((day) =>
    (day.route?.segments ?? []).map((segment) => segment.geometryFile).filter(Boolean),
  ));
  const paths = [...files];
  const results = await Promise.allSettled(paths.map((path) =>
    fetchJson(import.meta.env.BASE_URL + path.replace(/^\.?\//, ''), signal),
  ));
  const geometries = new Map();
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') geometries.set(paths[index], result.value);
    else failed.push(paths[index]);
  });
  return { geometries, failed };
}
