import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = resolve(root, 'public');
const tripsDirectory = resolve(publicDirectory, 'data', 'trips');
const routeBaseUrl = (process.env.OSRM_ROUTE_BASE_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');
const selectedTripId = process.argv[2];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function outputPathFor(relativePath) {
  const outputPath = resolve(publicDirectory, relativePath);
  if (!outputPath.startsWith(`${publicDirectory}${sep}`)) {
    throw new Error(`路线输出路径越界：${relativePath}`);
  }
  return outputPath;
}

function validateWaypoints(segment) {
  if (!Array.isArray(segment.waypoints) || segment.waypoints.length < 2) {
    throw new Error(`${segment.id} 至少需要两个 [纬度, 经度] 路由点`);
  }
  for (const coordinates of segment.waypoints) {
    const [lat, lng] = coordinates ?? [];
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error(`${segment.id} 包含无效路由点`);
    }
  }
}

async function requestRoute(segment) {
  validateWaypoints(segment);
  const coordinates = segment.waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = new URL(`${routeBaseUrl}/route/v1/driving/${coordinates}`);
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('annotations', 'false');
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('generate_hints', 'false');

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'TravelPlanningSystemRouteGenerator/1.0 (+https://github.com/gnailegoac/travel-planning-system)',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.code !== 'Ok' || !payload.routes?.[0]?.geometry) {
        throw new Error(payload.message ?? payload.code ?? '未返回路线');
      }
      return {
        route: payload.routes[0],
        snappedWaypoints: payload.waypoints ?? [],
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

const catalog = await readJson(resolve(tripsDirectory, 'index.json'));
const entries = selectedTripId
  ? catalog.trips.filter((entry) => entry.id === selectedTripId)
  : catalog.trips;

if (selectedTripId && entries.length === 0) {
  throw new Error(`目录中不存在行程：${selectedTripId}`);
}

let generatedCount = 0;
for (const entry of entries) {
  const trip = await readJson(resolve(tripsDirectory, entry.file));
  for (const day of trip.days ?? []) {
    for (const segment of day.route?.segments ?? []) {
      if (segment.mode !== 'driving' || !segment.geometryFile) continue;
      const { route, snappedWaypoints } = await requestRoute(segment);
      const feature = {
        type: 'Feature',
        properties: {
          tripId: trip.id,
          dayId: day.id,
          segmentId: segment.id,
          label: segment.label,
          mode: 'driving',
          routeQuality: 'road-network',
          routingProvider: routeBaseUrl,
          routingProfile: 'driving',
          requestOptions: {
            geometries: 'geojson',
            overview: 'full',
            steps: false,
            alternatives: false,
          },
          inputCoordinates: segment.waypoints.map(([lat, lng]) => [lng, lat]),
          snappedWaypoints: snappedWaypoints.map((waypoint) => waypoint.location),
          source: 'OSRM',
          sourceUrl: 'https://project-osrm.org/',
          mapData: '© OpenStreetMap contributors',
          mapDataUrl: 'https://www.openstreetmap.org/copyright',
          generatedAt: new Date().toISOString(),
          distanceMeters: Number(route.distance.toFixed(1)),
          durationSeconds: Number(route.duration.toFixed(1)),
          distanceKm: Number((route.distance / 1000).toFixed(1)),
          durationMinutes: Math.round(route.duration / 60),
        },
        geometry: route.geometry,
      };
      const outputPath = outputPathFor(segment.geometryFile);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, `${JSON.stringify(feature, null, 2)}\n`, 'utf8');
      generatedCount += 1;
      console.log(
        `${trip.id}/${day.id}/${segment.id}: ${feature.properties.distanceKm} km, ${feature.properties.durationMinutes} 分钟 -> ${relative(root, outputPath)}`,
      );
      await sleep(1100);
    }
  }
}

console.log(`完成：生成 ${generatedCount} 条道路路线。`);
