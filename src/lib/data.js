import { validateTrip } from './trip.js';

const dataBaseUrl = `${import.meta.env.BASE_URL}data/trips/`;

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
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
