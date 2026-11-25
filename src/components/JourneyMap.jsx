import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Compass, Layers3, LocateFixed, Minus, Plus, Scan } from 'lucide-react';
import { getRouteLines } from '../lib/playback.js';
import './JourneyMap.css';

const KM_PER_DEGREE = 111.2;
const THREE_DIMENSIONAL_PITCH = 0.66;
const NORTH_BEARING = 0.13;
const FLAT_PITCH = Math.PI / 2;
const BASENAME = `${import.meta.env.BASE_URL}data/basemap/world.geojson`;
const FONT = 'system-ui, -apple-system, "PingFang SC", sans-serif';
const WATER = '#102427';
const LAND = '#3c5149';
const RELIEF_COLORS = ['#273f39', '#304741', '#3a5046', '#43594d', '#4e6352', '#596d58', '#66765f', '#748269'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

let worldPromise;

function makeCoastline(polygons) {
  return polygons.map((rings) => {
    let west = Infinity;
    let east = -Infinity;
    let south = Infinity;
    let north = -Infinity;
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        west = Math.min(west, lng);
        east = Math.max(east, lng);
        south = Math.min(south, lat);
        north = Math.max(north, lat);
      }
    }
    return { rings, west, east, south, north };
  });
}

function loadWorld() {
  worldPromise ??= fetch(BASENAME).then(async (response) => {
    if (!response.ok) throw new Error('底图暂不可用');
    const world = await response.json();
    const features = world.features ?? [];
    const outlines = (type) => makeCoastline(features.flatMap((feature) =>
      feature.properties.layer === type ? feature.geometry.coordinates : [],
    ));
    return {
      land: outlines('land'),
      lakes: outlines('lake'),
      places: features
        .filter((feature) => feature.geometry.type === 'Point')
        .map(({ geometry, properties }) => ({ ...properties, position: [...geometry.coordinates].reverse() }))
        .sort((a, b) => a.minZoom - b.minZoom || b.population - a.population),
    };
  }).catch((error) => {
    worldPromise = undefined;
    throw error;
  });
  return worldPromise;
}

function longitudeDelta(lng, reference) {
  return ((lng - reference + 540) % 360) - 180;
}

function fit(coordinates, size, state) {
  const origin = coordinates[0] ?? [31, 105];
  let south = origin[0];
  let north = origin[0];
  let west = 0;
  let east = 0;
  for (const [lat, lng] of coordinates) {
    const x = longitudeDelta(lng, origin[1]);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, x);
    east = Math.max(east, x);
  }
  const lat = (south + north) / 2;
  const lng = ((origin[1] + (west + east) / 2 + 540) % 360) - 180;
  const lonScale = KM_PER_DEGREE * Math.cos(lat * Math.PI / 180);
  const pitch = state?.pitch ?? THREE_DIMENSIONAL_PITCH;
  const focal = Math.max(330, size.height) * 0.94;
  const xSpan = (east - west) * lonScale;
  const ySpan = (north - south) * KM_PER_DEGREE;
  const distance = Math.max(2.8, focal * Math.max(xSpan / (Math.max(320, size.width) * 0.66), ySpan * Math.sin(pitch) / (Math.max(330, size.height) * 0.52)), ySpan * 1.1);
  const camera = { lat, lng, distance, pitch, bearing: state?.bearing ?? NORTH_BEARING };
  const horizontalRoom = size.width * 0.5 - Math.min(size.width * 0.15, 72);
  const verticalRoom = size.height * 0.49 - Math.min(size.height * 0.20, 86);
  const stride = Math.max(1, Math.floor(coordinates.length / 480));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const view = makeProjection(camera, size);
    let overflow = 1;
    for (let index = 0; index < coordinates.length; index += index < 100 ? 1 : stride) {
      const p = view.mapPoint(coordinates[index]);
      overflow = Math.max(overflow, p ? Math.abs(p[0] - size.width * 0.5) / horizontalRoom : 1.4,
        p ? Math.abs(p[1] - size.height * 0.51) / verticalRoom : 1.4);
    }
    if (overflow <= 1.015) break;
    camera.distance *= Math.max(1.05, overflow * 0.94);
  }
  return camera;
}

function reliefHeight(lat, lng, amplitude) {
  const fold = Math.sin((lng + lat * 0.66) * 4.1 + Math.sin(lat * 3.1)) * 0.29;
  const hill = Math.cos(lat * 6.4 - lng * 2.2 + Math.sin(lng * 0.8)) * 0.22;
  const ridge = Math.abs(Math.sin(lng * 11.5 - lat * 9.3)) * 0.14;
  const texture = Math.sin(lat * 95 + lng * 58) * Math.cos(lat * 74 - lng * 34) * 0.045;
  return amplitude * Math.max(0.02, 0.38 + fold + hill + ridge + texture);
}

function makeProjection(camera, { width, height }) {
  const lonScale = KM_PER_DEGREE * Math.max(0.24, Math.cos(camera.lat * Math.PI / 180));
  const cosBearing = Math.cos(camera.bearing);
  const sinBearing = Math.sin(camera.bearing);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const focal = Math.max(330, height) * 0.94;
  const minDepth = camera.distance * 0.22;
  const surface = camera.distance * (0.012 + 0.012 * cosPitch);
  const amplitude = Math.min(95, camera.distance * 0.11) * Math.max(0.2, cosPitch);
  const scaleAtCenter = focal / camera.distance;
  const toWorld = ([lat, lng]) => [longitudeDelta(lng, camera.lng) * lonScale, (lat - camera.lat) * KM_PER_DEGREE];
  const toUnwrappedWorld = (lat, lng) => [(lng - camera.lng) * lonScale, (lat - camera.lat) * KM_PER_DEGREE];
  const toDegrees = (x, y) => [camera.lat + y / KM_PER_DEGREE, camera.lng + x / lonScale];
  const elevation = (lat, lng) => surface + reliefHeight(lat, lng, amplitude);
  const toCamera = (x, y, z) => {
    const east = x * cosBearing - y * sinBearing;
    const north = x * sinBearing + y * cosBearing;
    return [east, north * sinPitch + z * cosPitch, camera.distance + north * cosPitch - z * sinPitch];
  };
  const toScreen = ([x, y, depth]) => [width * 0.5 + x * focal / depth, height * 0.51 - y * focal / depth];
  const project = (x, y, z) => {
    const point = toCamera(x, y, z);
    return point[2] >= minDepth ? toScreen(point) : null;
  };
  const mapPoint = ([lat, lng], altitude = 0) => project(...toWorld([lat, lng]), elevation(lat, lng) + altitude);
  return { width, height, lonScale, surface, amplitude, minDepth, scaleAtCenter, sinPitch, toWorld, toUnwrappedWorld, toDegrees, elevation, toCamera, toScreen, project, mapPoint };
}

function intersectNear(a, b, near) {
  const t = (near - a[2]) / (b[2] - a[2]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near];
}

function traceRing(path, ring, longitudeOffset, view, altitude) {
  const cameraPoint = ([lng, lat]) => view.toCamera(...view.toUnwrappedWorld(lat, lng + longitudeOffset), altitude);
  let previous = cameraPoint(ring.at(-1));
  let lastDrawn;
  const lineTo = (cameraCoordinates) => {
    const point = view.toScreen(cameraCoordinates);
    if (!lastDrawn) path.moveTo(...point);
    else if (Math.abs(lastDrawn[0] - point[0]) + Math.abs(lastDrawn[1] - point[1]) > 0.36) path.lineTo(...point);
    else return;
    lastDrawn = point;
  };
  for (const coordinates of ring) {
    const point = cameraPoint(coordinates);
    const visible = point[2] >= view.minDepth;
    if (visible !== (previous[2] >= view.minDepth)) lineTo(intersectNear(previous, point, view.minDepth));
    if (visible) lineTo(point);
    previous = point;
  }
  if (lastDrawn) path.closePath();
}

function shapePath(polygons, camera, view, altitude) {
  const path = new Path2D();
  const latitudeRange = camera.distance * 2.7 / KM_PER_DEGREE;
  const longitudeRange = camera.distance * 2.7 / view.lonScale;
  for (const polygon of polygons) {
    if (polygon.north < camera.lat - latitudeRange || polygon.south > camera.lat + latitudeRange) continue;
    for (const offset of [-360, 0, 360]) {
      if (polygon.east + offset < camera.lng - longitudeRange || polygon.west + offset > camera.lng + longitudeRange) continue;
      for (const ring of polygon.rings) traceRing(path, ring, offset, view, altitude);
    }
  }
  return path;
}

function strokeWorldSegment(ctx, from, to, view) {
  let a = view.toCamera(...from);
  let b = view.toCamera(...to);
  if (a[2] < view.minDepth && b[2] < view.minDepth) return;
  if (a[2] < view.minDepth) a = intersectNear(a, b, view.minDepth);
  if (b[2] < view.minDepth) b = intersectNear(a, b, view.minDepth);
  ctx.moveTo(...view.toScreen(a));
  ctx.lineTo(...view.toScreen(b));
}

function scaleStep(target) {
  const factor = 10 ** Math.floor(Math.log10(target));
  return ([1, 2, 5, 10].find((step) => step * factor >= target) ?? 10) * factor;
}

function drawWater(ctx, camera, view) {
  const light = ctx.createLinearGradient(0, 0, view.width * 0.3, view.height);
  light.addColorStop(0, '#182e31');
  light.addColorStop(0.53, WATER);
  light.addColorStop(1, '#0a191d');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, view.width, view.height);

  const spacing = scaleStep(75 / view.scaleAtCenter);
  const extentX = camera.distance * Math.max(1.8, view.width / view.height * 1.6);
  const extentY = camera.distance * 1.6;
  const offsetX = camera.lng * view.lonScale % spacing;
  const offsetY = camera.lat * KM_PER_DEGREE % spacing;
  ctx.beginPath();
  for (let x = -Math.ceil(extentX / spacing) * spacing - offsetX; x <= extentX; x += spacing) {
    strokeWorldSegment(ctx, [x, -extentY, 0], [x, extentY, 0], view);
  }
  for (let y = -Math.ceil(extentY / spacing) * spacing - offsetY; y <= extentY; y += spacing) {
    strokeWorldSegment(ctx, [-extentX, y, 0], [extentX, y, 0], view);
  }
  ctx.lineWidth = 0.55;
  ctx.strokeStyle = 'rgba(119,178,171,0.19)';
  ctx.stroke();
}

function drawRelief(ctx, camera, view) {
  const step = camera.distance / 23;
  const halfColumns = clamp(Math.ceil(view.width / view.height * 13), 21, 52);
  const halfRows = Math.ceil(21 / view.sinPitch);
  const rows = [];
  const colorPaths = RELIEF_COLORS.map(() => new Path2D());
  const contours = new Path2D();
  const spacing = view.amplitude * 0.13;
  const levelStart = view.surface + spacing;

  const sample = (x, y) => {
    const [lat, lng] = view.toDegrees(x, y);
    const z = view.elevation(lat, lng);
    return { x, y, z, point: view.project(x, y, z) };
  };

  const triangle = (a, b, c) => {
    if (!a.point || !b.point || !c.point) return;
    const west = Math.min(a.point[0], b.point[0], c.point[0]);
    const east = Math.max(a.point[0], b.point[0], c.point[0]);
    const north = Math.min(a.point[1], b.point[1], c.point[1]);
    const south = Math.max(a.point[1], b.point[1], c.point[1]);
    if (west > view.width || east < 0 || north > view.height || south < 0) return;
    const slope = (a.z * 2 - b.z - c.z) / step;
    const level = ((a.z + b.z + c.z) / 3 - view.surface) / view.amplitude;
    const shade = clamp(Math.round(0.75 + level * 5.9 + slope * 0.75), 0, RELIEF_COLORS.length - 1);
    const fill = colorPaths[shade];
    fill.moveTo(...a.point);
    fill.lineTo(...b.point);
    fill.lineTo(...c.point);
    fill.closePath();

    const min = Math.min(a.z, b.z, c.z);
    const max = Math.max(a.z, b.z, c.z);
    for (let iso = levelStart + Math.max(0, Math.ceil((min - levelStart) / spacing)) * spacing; iso < max; iso += spacing) {
      const intersections = [];
      for (const [from, to] of [[a, b], [b, c], [c, a]]) {
        if ((from.z < iso) === (to.z < iso)) continue;
        const t = (iso - from.z) / (to.z - from.z);
        intersections.push(view.project(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, iso));
      }
      if (intersections[0] && intersections[1]) {
        contours.moveTo(...intersections[0]);
        contours.lineTo(...intersections[1]);
      }
    }
  };

  const xOffset = camera.lng * view.lonScale % step;
  const yOffset = camera.lat * KM_PER_DEGREE % step;
  for (let y = -halfRows; y <= halfRows; y += 1) {
    const row = [];
    for (let x = -halfColumns; x <= halfColumns; x += 1) row.push(sample(x * step - xOffset, y * step - yOffset));
    rows.push(row);
  }
  for (let y = rows.length - 2; y >= 0; y -= 1) {
    for (let x = 0; x < rows[y].length - 1; x += 1) {
      triangle(rows[y][x], rows[y][x + 1], rows[y + 1][x]);
      triangle(rows[y + 1][x + 1], rows[y + 1][x], rows[y][x + 1]);
    }
  }
  ctx.lineWidth = 0.6;
  colorPaths.forEach((path, index) => {
    ctx.fillStyle = RELIEF_COLORS[index];
    ctx.strokeStyle = RELIEF_COLORS[index];
    ctx.fill(path);
    ctx.stroke(path);
  });
  ctx.lineWidth = 0.45;
  ctx.strokeStyle = 'rgba(206,225,194,0.16)';
  ctx.stroke(contours);
}

function drawTerrain(ctx, world, camera, view) {
  if (!world) return;
  const land = shapePath(world.land, camera, view, view.surface);
  const landBottom = shapePath(world.land, camera, view, 0);
  const lakes = shapePath(world.lakes, camera, view, view.surface + view.amplitude * 0.26);

  ctx.save();
  ctx.fillStyle = '#1a302f';
  ctx.shadowColor = 'rgba(0,12,16,.75)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fill(landBottom, 'evenodd');
  ctx.restore();
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = 'rgba(131,173,160,.28)';
  ctx.stroke(landBottom);

  ctx.fillStyle = LAND;
  ctx.fill(land, 'evenodd');
  ctx.save();
  ctx.clip(land, 'evenodd');
  drawRelief(ctx, camera, view);
  const shade = ctx.createLinearGradient(view.width * 0.3, 0, view.width * 0.65, view.height);
  shade.addColorStop(0, 'rgba(165,190,142,.13)');
  shade.addColorStop(0.65, 'rgba(19,36,31,0)');
  shade.addColorStop(1, 'rgba(8,23,24,.25)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.restore();

  ctx.lineWidth = 1.1;
  ctx.strokeStyle = 'rgba(149,193,168,.68)';
  ctx.stroke(land);
  ctx.fillStyle = '#244245';
  ctx.fill(lakes, 'evenodd');
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = 'rgba(122,172,160,0.47)';
  ctx.stroke(lakes);
}

function drawPlaces(ctx, world, view, camera, stops) {
  if (!world) return;
  const visible = [];
  const mapZoom = clamp(Math.log2(43000 / (view.width / view.scaleAtCenter)), 2, 12);
  const coordinateLimit = camera.distance * 1.5;
  ctx.font = `500 11px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  for (const place of world.places) {
    if (place.minZoom > mapZoom + 0.5) break;
    const coordinates = view.toWorld(place.position);
    if (Math.abs(coordinates[0]) > coordinateLimit * 1.8 || Math.abs(coordinates[1]) > coordinateLimit) continue;
    const point = view.mapPoint(place.position);
    if (!point) continue;
    const [x, y] = point;
    if (x < 24 || x > view.width - 86 || y < 34 || y > view.height - 40) continue;
    const width = ctx.measureText(place.name).width + 12;
    if (stops.some((stop) => Math.abs(stop.y - y) < 21 && Math.abs(stop.x - x) < width + 38)) continue;
    if (visible.some((label) => Math.abs(label.y - y) < 17 && x < label.x + label.width + 10 && x + width + 10 > label.x)) continue;
    visible.push({ x, y, width });
    ctx.fillStyle = place.capital ? '#cedbc9' : '#a7bbad';
    ctx.strokeStyle = 'rgba(26,47,42,.72)';
    ctx.fillRect(x - 1.7, y - 1.7, 3.4, 3.4);
    ctx.strokeText(place.name, x + 6, y);
    ctx.fillText(place.name, x + 6, y);
    if (visible.length >= 18) break;
  }
}

function flightLine(points) {
  if (points.length !== 2) return points;
  const [start, end] = points;
  const delta = longitudeDelta(end[1], start[1]);
  return Array.from({ length: 31 }, (_, index) => {
    const t = index / 30;
    return [start[0] + (end[0] - start[0]) * t, start[1] + delta * t];
  });
}

function traceRoute(ctx, points, view, mode) {
  const flight = mode === 'flight';
  const line = flight ? flightLine(points) : points;
  const lift = flight ? getFlightLift(points, view) : 0;
  const cameraPoint = (position, index) => view.toCamera(...view.toWorld(position),
    view.elevation(...position) + Math.sin(index / (line.length - 1) * Math.PI) * lift);
  ctx.beginPath();
  let previous = cameraPoint(line[0], 0);
  if (previous[2] >= view.minDepth) ctx.moveTo(...view.toScreen(previous));
  for (let index = 1; index < line.length; index += 1) {
    const current = cameraPoint(line[index], index);
    const wasVisible = previous[2] >= view.minDepth;
    const visible = current[2] >= view.minDepth;
    if (wasVisible && !visible) ctx.lineTo(...view.toScreen(intersectNear(previous, current, view.minDepth)));
    if (!wasVisible && visible) ctx.moveTo(...view.toScreen(intersectNear(previous, current, view.minDepth)));
    if (visible) ctx.lineTo(...view.toScreen(current));
    previous = current;
  }
}

function getFlightLift(points, view) {
  const start = view.toWorld(points[0]);
  const end = view.toWorld(points.at(-1));
  return Math.min(view.amplitude * 1.3, 0.015 * Math.hypot(end[0] - start[0], end[1] - start[1]));
}

function flightAltitude(position, routes, view) {
  const [x, y] = view.toWorld(position);
  let closest = Infinity;
  let altitude = 0;
  for (const { geometry, mode } of routes) {
    if (mode !== 'flight') continue;
    let start = view.toWorld(geometry[0]);
    for (let index = 1; index < geometry.length; index += 1) {
      const end = view.toWorld(geometry[index]);
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const time = clamp(((x - start[0]) * dx + (y - start[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      const distance = Math.hypot(x - start[0] - dx * time, y - start[1] - dy * time);
      if (distance < closest) {
        closest = distance;
        const progress = (index - 1 + time) / (geometry.length - 1);
        altitude = Math.sin(progress * Math.PI) * getFlightLift(geometry, view);
      }
      start = end;
    }
  }
  return altitude;
}

function drawRoutes(ctx, routes, view) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const colors = { walk: '#d3e6a0', flight: '#dfdfac', train: '#84f1d0', driving: '#9af4cb' };
  for (const { geometry, mode, schematic } of routes) {
    if (geometry.length < 2) continue;
    const dashed = schematic || mode === 'flight';
    traceRoute(ctx, geometry, view, mode);
    ctx.setLineDash(dashed ? [6, 5] : []);
    ctx.strokeStyle = 'rgba(13,32,24,.82)';
    ctx.lineWidth = dashed ? 4.6 : 5.8;
    ctx.stroke();
    ctx.strokeStyle = colors[mode] ?? '#9be4b6';
    ctx.lineWidth = dashed ? 2 : 2.7;
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function getStops(trip, day, view) {
  const days = day ? [day] : trip.days;
  return days.flatMap((item) => (item.stops ?? []).flatMap((stop, index) => {
    if (!stop.coordinates) return [];
    const point = view.mapPoint(stop.coordinates);
    if (!point) return [];
    const [x, y] = point;
    if (x < 12 || x > view.width - 12 || y < 12 || y > view.height - 12) return [];
    return [{ stop, day: item, x, y, index }];
  }));
}

function selectMarkers(points, activeStopId, showLabels, width) {
  const buttons = [];
  const labels = [];
  const priority = ({ stop }) => stop.id === activeStopId ? 3 : stop.kind === 'attraction' || stop.kind === 'lodging' ? 2 : 0;
  for (const point of [...points].sort((a, b) => priority(b) - priority(a))) {
    if (buttons.some((button) => Math.hypot(point.x - button.x, point.y - button.y) < 21)) continue;
    const nameWidth = Math.min(120, point.stop.name.length * 11 + 10);
    const active = point.stop.id === activeStopId;
    const left = point.x + nameWidth + 18 > width - 12;
    const lo = left ? point.x - nameWidth - 20 : point.x - 3;
    const hi = left ? point.x + 3 : point.x + nameWidth + 20;
    const label = showLabels && !active && labels.length < 6 && point.y > 74 && point.x > 50
      && !labels.some((existing) => Math.abs(existing.y - point.y) < 26 && lo < existing.hi + 6 && hi > existing.lo - 6);
    if (label) labels.push({ lo, hi, y: point.y });
    buttons.push({ ...point, active, label, left });
  }
  return buttons;
}

function formatScale(km) {
  return km >= 1 ? `${Math.round(km * 10) / 10} 公里` : `${Math.round(km * 1000)} 米`;
}

function paintMap(canvas, size, world, camera, view, stops, routes) {
  const resolution = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(size.width * resolution));
  canvas.height = Math.max(1, Math.round(size.height * resolution));
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
  drawWater(ctx, camera, view);
  drawTerrain(ctx, world, camera, view);
  drawPlaces(ctx, world, view, camera, stops);
  drawRoutes(ctx, routes, view);
}

function panCamera(camera, size, dx, dy) {
  const view = makeProjection(camera, size);
  const x = -dx / view.scaleAtCenter;
  const y = dy / (view.scaleAtCenter * view.sinPitch);
  const c = Math.cos(camera.bearing);
  const s = Math.sin(camera.bearing);
  const lat = clamp(camera.lat + (y * c - x * s) / KM_PER_DEGREE, -79, 79);
  const lng = ((camera.lng + (x * c + y * s) / view.lonScale + 540) % 360) - 180;
  return { ...camera, lat, lng };
}

function Traveler({ position, moving }) {
  return (
    <div className={`journey-traveler${moving ? ' is-moving' : ''}`} style={{ left: position[0], top: position[1] }} aria-label="旅行者">
      <span className="journey-traveler-halo" aria-hidden="true" />
      <span className="journey-traveler-shadow" aria-hidden="true" />
      <span className="journey-traveler-figure" aria-hidden="true">
        <span className="traveler-leg traveler-leg-left" />
        <span className="traveler-leg traveler-leg-right" />
        <span className="traveler-backpack" />
        <span className="traveler-arm traveler-arm-left" />
        <span className="traveler-arm traveler-arm-right" />
        <span className="traveler-coat" />
        <span className="traveler-head" />
        <span className="traveler-cap" />
      </span>
    </div>
  );
}

export function JourneyMap({ trip, day, geometries, position, activeStopId, onStopSelect, moving = false, mode }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const pointers = useRef(new Map());
  const [world, setWorld] = useState(null);
  const [baseStatus, setBaseStatus] = useState('loading');
  const [size, setSize] = useState({ width: 700, height: 510 });
  const [cameraOverride, setCameraOverride] = useState(null);
  const [pitch, setPitch] = useState(THREE_DIMENSIONAL_PITCH);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let connected = true;
    loadWorld().then((data) => {
      if (!connected) return;
      setWorld(data);
      setBaseStatus('ready');
    }).catch(() => {
      if (connected) setBaseStatus('unavailable');
    });
    return () => { connected = false; };
  }, []);

  useLayoutEffect(() => {
    const container = hostRef.current;
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width && height) setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const key = `${trip.id}:${day?.id ?? 'all'}`;
  const prepared = useMemo(() => {
    const days = day ? [day] : trip.days;
    const routes = days.flatMap((item) => (item.route?.segments ?? []).flatMap((segment) =>
      getRouteLines(segment, geometries).map((geometry) => ({
        geometry,
        mode: segment.mode,
        schematic: !segment.geometryFile || !geometries?.has(segment.geometryFile),
      })),
    ));
    const bounds = days.flatMap((item) => (item.stops ?? []).map((stop) => stop.coordinates).filter(Boolean));
    for (const route of routes) for (const coordinate of route.geometry) bounds.push(coordinate);
    return { routes, bounds };
  }, [trip, day, geometries]);
  const fitted = useMemo(() => fit(prepared.bounds, size, { pitch }), [prepared.bounds, size, pitch]);
  const camera = cameraOverride?.key === key ? cameraOverride : fitted;
  const view = useMemo(() => makeProjection(camera, size), [camera, size]);
  const stops = useMemo(() => getStops(trip, day, view), [trip, day, view]);
  const markers = useMemo(() => selectMarkers(stops, activeStopId, Boolean(day), size.width), [stops, activeStopId, day, size.width]);
  const traveler = position && view.mapPoint(position, mode === 'flight' ? flightAltitude(position, prepared.routes, view) : 0);
  const travelerVisible = traveler && traveler[0] >= 4 && traveler[0] <= size.width - 4 && traveler[1] >= 42 && traveler[1] <= size.height - 4;
  const scale = scaleStep(52 / view.scaleAtCenter);

  useLayoutEffect(() => {
    paintMap(canvasRef.current, size, world, camera, view, stops, prepared.routes);
  }, [size, world, camera, view, stops, prepared.routes]);

  const changeCamera = (change) => setCameraOverride((previous) => ({
    ...change(previous?.key === key ? previous : fitted), key,
  }));
  const zoom = (factor) => changeCamera((current) => ({ ...current, distance: clamp(current.distance * factor, 0.24, 17000) }));
  const recenter = () => {
    if (!position) return;
    changeCamera((current) => ({ ...current, lat: position[0], lng: position[1] }));
  };

  useEffect(() => {
    const host = hostRef.current;
    const wheel = (event) => {
      if (document.activeElement !== host && !event.ctrlKey) return;
      event.preventDefault();
      const factor = Math.exp(clamp(event.deltaY, -130, 130) * 0.0036);
      setCameraOverride((previous) => {
        const current = previous?.key === key ? previous : fitted;
        return { ...current, key, distance: clamp(current.distance * factor, 0.24, 17000) };
      });
    };
    host.addEventListener('wheel', wheel, { passive: false });
    return () => host.removeEventListener('wheel', wheel);
  }, [key, fitted]);

  const pointerStart = (event) => {
    if (!['touch', 'pen'].includes(event.pointerType) && event.button !== 0) return;
    if (event.target.closest('button, a')) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const pointerMove = (event) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    const pair = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1];
    pointers.current.set(event.pointerId, next);
    if (pair) {
      const before = Math.hypot(previous.x - pair.x, previous.y - pair.y);
      const after = Math.hypot(next.x - pair.x, next.y - pair.y);
      if (before > 6 && after > 6) zoom(before / after);
    } else if (event.shiftKey) {
      changeCamera((current) => ({
        ...current,
        pitch: clamp(current.pitch + (next.y - previous.y) * 0.006, 0.34, FLAT_PITCH),
        bearing: current.bearing - (next.x - previous.x) * 0.007,
      }));
    } else {
      changeCamera((current) => panCamera(current, size, next.x - previous.x, next.y - previous.y));
    }
  };

  const pointerStop = (event) => {
    pointers.current.delete(event.pointerId);
    if (!pointers.current.size) setDragging(false);
  };

  const handleKey = (event) => {
    if (event.target !== hostRef.current) return;
    const move = { ArrowLeft: [48, 0], ArrowRight: [-48, 0], ArrowDown: [0, -48], ArrowUp: [0, 48] }[event.key];
    if (move) changeCamera((current) => panCamera(current, size, ...move));
    else if (event.key === '+' || event.key === '=') zoom(0.72);
    else if (event.key === '-') zoom(1.38);
    else if (event.key === 'Home') setCameraOverride(null);
    else return;
    event.preventDefault();
  };

  const togglePitch = () => {
    const next = camera.pitch > 1.3 ? THREE_DIMENSIONAL_PITCH : FLAT_PITCH;
    setPitch(next);
    changeCamera((current) => ({ ...current, pitch: next }));
  };

  return (
    <div
      ref={hostRef}
      className={`journey-map${dragging ? ' is-dragging' : ''}`}
      aria-label="三维行程地图，可拖动，按加减键缩放"
      data-basemap={baseStatus}
      data-route-count={prepared.routes.length}
      data-traveler-lat={position?.[0]}
      data-traveler-lng={position?.[1]}
      data-pitch={camera.pitch.toFixed(2)}
      data-view-km={camera.distance.toFixed(3)}
      role="region"
      tabIndex={0}
      onPointerDown={pointerStart}
      onPointerMove={pointerMove}
      onPointerUp={pointerStop}
      onPointerCancel={pointerStop}
      onLostPointerCapture={pointerStop}
      onKeyDown={handleKey}
    >
      <canvas ref={canvasRef} className="journey-map-canvas" aria-hidden="true" />
      <div className="journey-map-shade" aria-hidden="true" />
      {markers.map(({ stop, day: stopDay, index, x, y, active, label, left }) => (
        <button
          type="button"
          className={`journey-map-point${active ? ' is-active' : ''}`}
          style={{ left: x, top: y }}
          key={`${stopDay.id}:${stop.id}`}
          title={stop.name}
          aria-label={`定位活动 ${stop.name}`}
          aria-current={active ? 'location' : undefined}
          onClick={() => onStopSelect?.(stop, stopDay)}
        >
          <span className="journey-map-point-dot" aria-hidden="true">{index + 1}</span>
          {label && <span className={`journey-map-point-label${left ? ' is-left' : ''}`} aria-hidden="true">{stop.name}</span>}
        </button>
      ))}
      {travelerVisible && <Traveler position={traveler} moving={moving} />}
      <div className="journey-map-tools" role="group" aria-label="地图操作">
        <button type="button" title="恢复正北方向" aria-label="恢复正北方向" onClick={() => changeCamera((current) => ({ ...current, bearing: 0 }))}>
          <Compass size={19} style={{ transform: `rotate(${camera.bearing * 180 / Math.PI}deg)` }} aria-hidden="true" />
        </button>
        <span className="journey-map-tool-group">
          <button type="button" title="放大地图" aria-label="放大地图" onClick={() => zoom(0.7)}><Plus size={20} aria-hidden="true" /></button>
          <button type="button" title="缩小地图" aria-label="缩小地图" onClick={() => zoom(1.42)}><Minus size={20} aria-hidden="true" /></button>
        </span>
        <button type="button" title="切换平面或三维视角" aria-pressed={camera.pitch < 1.3} aria-label="三维视角" onClick={togglePitch}><Layers3 size={18} aria-hidden="true" /></button>
        <button type="button" title="地图居中到旅行者" aria-label="地图居中到旅行者" disabled={!position} onClick={recenter}><LocateFixed size={18} aria-hidden="true" /></button>
        <button type="button" title="显示完整路线" aria-label="显示完整路线" onClick={() => setCameraOverride(null)}><Scan size={18} aria-hidden="true" /></button>
      </div>
      <div className="journey-map-scale" aria-hidden="true">
        <span>{formatScale(scale)}</span>
        <i style={{ width: scale * view.scaleAtCenter }} />
      </div>
      <div className="journey-map-attribution">
        {baseStatus === 'unavailable' && <span role="status">底图暂不可用 · </span>}
        <span title="虚线表示航班及缺少轨迹的连接。">虚线示意 · </span>
        <span>示意地形 · </span>
        <a href="https://www.naturalearthdata.com/" rel="noreferrer" target="_blank">Natural Earth</a>
        {' · '}
        <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap</a>
      </div>
    </div>
  );
}
