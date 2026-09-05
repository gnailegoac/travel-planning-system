import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTrip } from '../src/lib/trip.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tripsDirectory = resolve(root, 'public', 'data', 'trips');
const publicDirectory = resolve(root, 'public');
const supportedRouteModes = new Set(['driving', 'shuttle', 'walk', 'flight', 'taxi']);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function hasValidLatLngs(coordinates) {
  return Array.isArray(coordinates)
    && coordinates.length >= 2
    && coordinates.every(([lat, lng] = []) => (
      Number.isFinite(lat) && lat >= -90 && lat <= 90
      && Number.isFinite(lng) && lng >= -180 && lng <= 180
    ));
}

function hasGeoJsonLineCoordinates(geometry) {
  const hasValidPoint = ([lng, lat] = []) => (
    Number.isFinite(lng) && lng >= -180 && lng <= 180
    && Number.isFinite(lat) && lat >= -90 && lat <= 90
  );
  if (geometry?.type === 'LineString') {
    return Array.isArray(geometry.coordinates)
      && geometry.coordinates.length >= 2
      && geometry.coordinates.every(hasValidPoint);
  }
  if (geometry?.type === 'MultiLineString') {
    return Array.isArray(geometry.coordinates)
      && geometry.coordinates.length > 0
      && geometry.coordinates.every((line) => (
        Array.isArray(line) && line.length >= 2 && line.every(hasValidPoint)
      ));
  }
  return false;
}

const catalog = await readJson(resolve(tripsDirectory, 'index.json'));
const errors = [];

if (catalog.schemaVersion !== 1) errors.push('行程目录 schemaVersion 必须为 1');
if (!Array.isArray(catalog.trips) || catalog.trips.length === 0) errors.push('行程目录不能为空');

const ids = new Set();
for (const entry of catalog.trips ?? []) {
  if (!entry.id || !entry.file || !entry.title) {
    errors.push('目录项缺少 id、file 或 title');
    continue;
  }
  if (ids.has(entry.id)) errors.push(`目录中存在重复 id：${entry.id}`);
  ids.add(entry.id);

  try {
    const trip = await readJson(resolve(tripsDirectory, entry.file));
    const tripErrors = validateTrip(trip).map((message) => `${entry.file}: ${message}`);
    errors.push(...tripErrors);
    if (trip.id !== entry.id) errors.push(`${entry.file}: 文件 id 与目录 id 不一致`);
    if (trip.title !== entry.title) errors.push(`${entry.file}: 文件标题与目录标题不一致`);
    if (trip.startDate !== entry.startDate || trip.endDate !== entry.endDate) {
      errors.push(`${entry.file}: 日期范围与目录不一致`);
    }
    for (const [dayIndex, day] of trip.days.entries()) {
      const segments = day.route?.segments ?? [];
      if (!segments.length && !hasValidLatLngs(day.route?.geometry)) {
        errors.push(`${entry.file}: 第 ${dayIndex + 1} 天至少需要两个路线坐标`);
      }
      const segmentIds = new Set();
      for (const segment of segments) {
        if (!segment.id || segmentIds.has(segment.id)) {
          errors.push(`${entry.file}: ${day.id} 路段 id 缺失或重复`);
        }
        segmentIds.add(segment.id);
        if (!supportedRouteModes.has(segment.mode)) {
          errors.push(`${entry.file}: ${day.id}/${segment.id} mode 不受支持：${segment.mode ?? '缺失'}`);
        }
        if (segment.mode === 'driving') {
          if (!hasValidLatLngs(segment.waypoints)) {
            errors.push(`${entry.file}: ${day.id}/${segment.id} 自驾段至少需要两个有效 waypoints`);
          }
          if (!segment.geometryFile) {
            errors.push(`${entry.file}: ${day.id}/${segment.id} 自驾段缺少 geometryFile`);
            continue;
          }
          const geometryPath = resolve(publicDirectory, segment.geometryFile);
          const relativeGeometryPath = relative(publicDirectory, geometryPath);
          if (relativeGeometryPath.startsWith('..') || isAbsolute(relativeGeometryPath)) {
            errors.push(`${entry.file}: ${day.id}/${segment.id} 路线文件路径越界`);
            continue;
          }
          try {
            const geoJson = await readJson(geometryPath);
            const geometry = geoJson.type === 'Feature' ? geoJson.geometry : geoJson;
            if (!['LineString', 'MultiLineString'].includes(geometry?.type)) {
              errors.push(`${entry.file}: ${day.id}/${segment.id} 路线不是 LineString/MultiLineString`);
            }
            if (!hasGeoJsonLineCoordinates(geometry)) {
              errors.push(`${entry.file}: ${day.id}/${segment.id} 路线坐标为空`);
            }
          } catch (error) {
            errors.push(`${entry.file}: ${day.id}/${segment.id} 无法读取路线文件：${error.message}`);
          }
        } else if (!hasValidLatLngs(segment.coordinates)) {
          errors.push(`${entry.file}: ${day.id}/${segment.id} 非自驾段至少需要两个有效坐标`);
        }
      }
    }
  } catch (error) {
    errors.push(`${entry.file}: ${error.message}`);
  }
}

if (!ids.has(catalog.defaultTripId)) errors.push('defaultTripId 不在行程目录中');

if (errors.length) {
  console.error(`行程数据校验失败（${errors.length} 项）：`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`行程数据校验通过：${catalog.trips.length} 个行程。`);
}
