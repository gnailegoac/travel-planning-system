import { timeToMinutes } from './trip.js';

const DAY_MINUTES = 1440;
const DEGREE = Math.PI / 180;
const CLOCKS = new Map();
const SPEEDS = { walk: 4, taxi: 38, driving: 58, bus: 42, shuttle: 28, train: 126, flight: 650 };

function wallClock(timeZone) {
  if (!CLOCKS.has(timeZone)) {
    try {
      CLOCKS.set(timeZone, new Intl.DateTimeFormat('en-GB', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }));
    } catch {
      return null;
    }
  }
  return CLOCKS.get(timeZone);
}

function resolveZone(...zones) {
  return zones.find((zone) => zone && wallClock(zone)) ?? 'UTC';
}

function localClock(minute, timeZone) {
  const parts = wallClock(timeZone).formatToParts(Math.floor(minute) * 60_000);
  const fields = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]));
  return { date: `${fields.year}-${fields.month}-${fields.day}`, time: `${fields.hour}:${fields.minute}` };
}

function asUtcMinute(date, minutes) {
  return Date.parse(`${date}T00:00:00Z`) / 60_000 + minutes;
}

function zonedMinute(date, minutes, timeZone) {
  const expected = asUtcMinute(date, minutes);
  if (!Number.isFinite(expected)) return NaN;
  let minute = expected;
  let firstMinuteAfter = Infinity;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const displayed = localClock(minute, timeZone);
    const wall = asUtcMinute(displayed.date, timeToMinutes(displayed.time));
    if (wall === expected) return minute;
    if (wall > expected) firstMinuteAfter = Math.min(firstMinuteAfter, minute);
    minute += expected - wall;
  }
  // During a forward daylight-saving jump the clock can skip a requested time.
  return Number.isFinite(firstMinuteAfter) ? firstMinuteAfter : minute;
}

function validPoint(point) {
  return Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])
    && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;
}

function geoJsonLines(geoJson) {
  if (!geoJson) return [];
  switch (geoJson.type) {
    case 'FeatureCollection': return (geoJson.features ?? []).flatMap(geoJsonLines);
    case 'Feature': return geoJsonLines(geoJson.geometry);
    case 'GeometryCollection': return (geoJson.geometries ?? []).flatMap(geoJsonLines);
    case 'MultiLineString': return geoJson.coordinates ?? [];
    case 'LineString': return [geoJson.coordinates ?? []];
    default: return [];
  }
}

function loadedLines(segment, geometries) {
  if (!segment.geometryFile) return [];
  return geoJsonLines(geometries.get(segment.geometryFile))
    .filter(Array.isArray)
    .map((line) => line.filter(Array.isArray).map(([lng, lat]) => [lat, lng]).filter(validPoint))
    .filter((line) => line.length > 1);
}

export function getRouteLines(segment, geometries = new Map()) {
  const lines = loadedLines(segment, geometries);
  if (lines.length) return lines;
  const waypoints = (segment.coordinates ?? segment.waypoints ?? []).filter(validPoint);
  return waypoints.length > 1 ? [waypoints] : [];
}

function longitudeDifference(value) {
  return ((value + 540) % 360) - 180;
}

function distance(left, right) {
  const latitude = (right[0] - left[0]) * DEGREE;
  const longitude = longitudeDifference(right[1] - left[1]) * DEGREE;
  const halfChord = Math.sin(latitude / 2) ** 2
    + Math.cos(left[0] * DEGREE) * Math.cos(right[0] * DEGREE) * Math.sin(longitude / 2) ** 2;
  return 12_742 * Math.asin(Math.min(1, Math.sqrt(halfChord)));
}

function interpolate(left, right, fraction) {
  return [
    left[0] + (right[0] - left[0]) * fraction,
    longitudeDifference(left[1] + longitudeDifference(right[1] - left[1]) * fraction),
  ];
}

function accumulatedDistances(points) {
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances.push(distances[index - 1] + distance(points[index - 1], points[index]));
  }
  return distances;
}

function atDistance(points, distances, target) {
  let left = 0;
  let right = distances.length - 1;
  while (right - left > 1) {
    const middle = Math.floor((left + right) / 2);
    if (distances[middle] <= target) left = middle;
    else right = middle;
  }
  const span = distances[right] - distances[left];
  const fraction = span ? Math.min(1, Math.max(0, (target - distances[left]) / span)) : 0;
  return interpolate(points[left], points[right], fraction);
}

function makeTracks(routes) {
  return routes.flatMap((route) => {
    const connected = [];
    for (const points of route.lines) {
      const previous = connected.at(-1);
      if (previous && distance(previous.at(-1), points[0]) <= 0.18) previous.push(...points);
      else connected.push([...points]);
    }
    return connected.map((points) => {
      const declared = (route.coordinates ?? route.waypoints ?? []).filter(validPoint);
      if (connected.length === 1 && declared.length > 1) {
        const from = declared[0];
        const to = declared.at(-1);
        const forward = distance(points[0], from) + distance(points.at(-1), to);
        const backward = distance(points[0], to) + distance(points.at(-1), from);
        if (backward + 0.01 < forward) points.reverse();
      }
      const distances = accumulatedDistances(points);
      const length = distances.at(-1);
      const bothDirections = route.bidirectional || /⇄|往返/.test(route.label ?? '')
        || distance(points[0], points.at(-1)) <= 0.008;
      return { route, points, distances, length, bothDirections };
    }).filter((track) => track.length > 0.001);
  });
}

function project(track, target, after = 0) {
  const horizontalScale = Math.cos(target[0] * DEGREE);
  let nearest = { offset: Infinity };
  for (let index = 1; index < track.points.length; index += 1) {
    if (track.distances[index] < after) continue;
    const from = track.points[index - 1];
    const to = track.points[index];
    const dx = longitudeDifference(to[1] - from[1]) * horizontalScale;
    const dy = to[0] - from[0];
    const spanSquared = dx * dx + dy * dy;
    if (!spanSquared) continue;
    const px = longitudeDifference(target[1] - from[1]) * horizontalScale;
    const py = target[0] - from[0];
    const before = track.distances[index - 1];
    const length = track.distances[index] - before;
    const minimum = Math.max(0, (after - before) / length);
    const fraction = Math.min(1, Math.max(minimum, (px * dx + py * dy) / spanSquared));
    const point = interpolate(from, to, fraction);
    const offset = distance(point, target);
    if (offset < nearest.offset) {
      const along = before + length * fraction;
      nearest = { along, point, offset };
    }
  }
  return nearest;
}

function onTrack(track, from, to) {
  return { track, from, to, length: Math.abs(to - from) };
}

function sectionCost({ track, from, to, length }) {
  if (track.bothDirections || to >= from || length < 0.002) return length;
  return length + Math.min(4.5, 0.48 + length * 2);
}

function connector(from, to, length = distance(from, to)) {
  return { from, to, length };
}

function graphFor(tracks) {
  const endpoints = tracks.flatMap((track) => [track.points[0], track.points.at(-1)]);
  const edges = endpoints.map(() => []);
  tracks.forEach((track, index) => {
    const first = index * 2;
    const last = first + 1;
    const forward = onTrack(track, 0, track.length);
    const backward = onTrack(track, track.length, 0);
    edges[first].push({ index: last, cost: sectionCost(forward), part: forward });
    edges[last].push({ index: first, cost: sectionCost(backward), part: backward });
  });
  for (let first = 0; first < endpoints.length; first += 1) {
    for (let last = first + 1; last < endpoints.length; last += 1) {
      if (Math.floor(first / 2) === Math.floor(last / 2)) continue;
      const length = distance(endpoints[first], endpoints[last]);
      if (length > 0.45) continue;
      const cost = length * 5 + 0.025;
      edges[first].push({ index: last, cost, part: connector(endpoints[first], endpoints[last], length) });
      edges[last].push({ index: first, cost, part: connector(endpoints[last], endpoints[first], length) });
    }
  }
  return { tracks, edges };
}

function makePath(parts, approximate = false) {
  let end = 0;
  let primary;
  let longest = 0;
  const slices = parts.filter((part) => part.length > 0.0001).map((part) => {
    const route = part.track?.route;
    if (route && part.length > longest) {
      primary = route;
      longest = part.length;
    }
    const start = end;
    end += part.length / (SPEEDS[route?.mode] ?? SPEEDS.walk);
    return { ...part, start, end };
  });
  return { slices, duration: end, primary, approximate: approximate || slices.some((part) => part.track?.route.approximate) };
}

function findPath(graph, from, to, anchor) {
  const gap = distance(from, to);
  if (gap < 0.008) return null;
  const tolerance = Math.max(0.10, Math.min(1.2, gap * 0.24));
  const costs = graph.edges.map(() => Infinity);
  const paths = graph.edges.map(() => []);
  const arrivals = graph.edges.map(() => null);
  const visited = new Set();
  let best = { cost: Infinity, parts: null };

  graph.tracks.forEach((track, index) => {
    const start = anchor?.track === track ? anchor.projection : project(track, from);
    const end = project(track, to);
    const startMatches = start.offset <= tolerance;
    const endMatches = end.offset <= tolerance;
    if (startMatches && endMatches && Math.abs(start.along - end.along) >= gap * 0.45) {
      const section = onTrack(track, start.along, end.along);
      const cost = sectionCost(section) + 5 * (start.offset + end.offset);
      if (cost < best.cost) {
        best = { cost, parts: [connector(from, start.point, start.offset), section, connector(end.point, to, end.offset)] };
      }
    }
    [0, track.length].forEach((along, side) => {
      const node = index * 2 + side;
      if (startMatches) {
        const section = onTrack(track, start.along, along);
        costs[node] = sectionCost(section) + 5 * start.offset;
        paths[node] = [connector(from, start.point, start.offset), section];
      }
      if (endMatches) {
        const section = onTrack(track, along, end.along);
        arrivals[node] = {
          cost: sectionCost(section) + 5 * end.offset,
          parts: [section, connector(end.point, to, end.offset)],
        };
      }
    });
  });

  // Combine only connected tracks, including station and ropeway changes.
  while (visited.size < costs.length) {
    let current = -1;
    for (let index = 0; index < costs.length; index += 1) {
      if (!visited.has(index) && (current === -1 || costs[index] < costs[current])) current = index;
    }
    if (current === -1 || costs[current] >= best.cost) break;
    visited.add(current);
    const arrival = arrivals[current];
    if (arrival && costs[current] + arrival.cost < best.cost) {
      const parts = [...paths[current], ...arrival.parts];
      const onRouteLength = parts.reduce((sum, part) => sum + (part.track ? part.length : 0), 0);
      if (onRouteLength >= gap * 0.45) best = { cost: costs[current] + arrival.cost, parts };
    }
    for (const edge of graph.edges[current]) {
      const cost = costs[current] + edge.cost;
      if (cost >= costs[edge.index]) continue;
      costs[edge.index] = cost;
      paths[edge.index] = [...paths[current], edge.part];
    }
  }
  return best.parts ? makePath(best.parts) : makePath([connector(from, to, gap)], true);
}

function findLoop(graph, stop) {
  const { coordinates, movementLoopSegmentId } = stop;
  for (const track of graph.tracks) {
    if (track.route.id !== movementLoopSegmentId) continue;
    const entry = project(track, coordinates);
    if (entry.offset > 0.35) continue;
    const exit = project(track, coordinates, entry.along + 0.35);
    if (exit.offset > entry.offset + 0.012) continue;
    const path = makePath([
      connector(coordinates, entry.point, entry.offset),
      onTrack(track, entry.along, exit.along),
      connector(exit.point, coordinates, exit.offset),
    ]);
    return { path, anchor: { track, projection: exit } };
  }
  return null;
}

function evaluatePath(path, progress) {
  const minute = path.duration * progress;
  const part = path.slices.find((slice) => minute < slice.end) ?? path.slices.at(-1);
  const fraction = (minute - part.start) / (part.end - part.start);
  const { track, from, to } = part;
  const position = track
    ? atDistance(track.points, track.distances, from + (to - from) * fraction)
    : interpolate(from, to, fraction);
  return { position, route: track?.route ?? path.primary };
}

function eventsForDay(day, dayIndex, trip, defaultZone) {
  let date = day.date;
  if (!date) {
    const fallback = asUtcMinute(trip.startDate, dayIndex * DAY_MINUTES);
    if (!Number.isFinite(fallback)) return [];
    date = new Date(fallback * 60_000).toISOString().slice(0, 10);
  }
  let previousArrival = -Infinity;
  let inferredOffset = 0;
  return (day.stops ?? []).flatMap((stop, stopIndex) => {
    const arrivalClock = timeToMinutes(stop.arrival);
    const departureClock = timeToMinutes(stop.departure);
    if (arrivalClock == null || departureClock == null || !validPoint(stop.coordinates)) return [];
    const stopZone = resolveZone(stop.timezone, stop.timeZone, day.timezone, day.timeZone, defaultZone);
    const arrivalZone = resolveZone(stop.arrivalTimezone, stop.arrivalTimeZone, stopZone);
    const departureZone = resolveZone(stop.departureTimezone, stop.departureTimeZone, stopZone);
    let offset = Number.isInteger(stop.arrivalDayOffset) ? stop.arrivalDayOffset : inferredOffset;
    let start = zonedMinute(date, arrivalClock + offset * DAY_MINUTES, arrivalZone);
    if (!Number.isFinite(start)) return [];
    if (stop.arrivalDayOffset == null && start + 720 < previousArrival) {
      inferredOffset = ++offset;
      start = zonedMinute(date, arrivalClock + offset * DAY_MINUTES, arrivalZone);
    }
    previousArrival = start;
    const endOffset = Number.isInteger(stop.departureDayOffset) ? stop.departureDayOffset : offset;
    let end = zonedMinute(date, departureClock + endOffset * DAY_MINUTES, departureZone);
    if (end < start && stop.departureDayOffset == null) {
      end = zonedMinute(date, departureClock + (endOffset + 1) * DAY_MINUTES, departureZone);
    }
    return [{ day, dayIndex, date, stop, stopIndex, start, end: Math.max(start, end), arrivalZone, departureZone }];
  });
}

export function buildPlayback(trip, geometries = new Map()) {
  const days = trip.days ?? [];
  const defaultZone = resolveZone(trip.timezone, trip.timeZone);
  const routesByDay = new Map();
  const tracksByDay = new Map();
  const graphs = new Map();
  for (const day of days) {
    const routes = (day.route?.segments ?? []).flatMap((segment) => {
      const fromFile = loadedLines(segment, geometries);
      const lines = fromFile.length ? fromFile : getRouteLines(segment);
      if (!lines.length) return [];
      return [{ ...segment, day, lines, approximate: !fromFile.length && segment.mode !== 'flight' }];
    });
    routesByDay.set(day.id, routes);
    tracksByDay.set(day.id, makeTracks(routes));
  }
  const network = (firstDay, nextDay = firstDay) => {
    const key = `${firstDay.id}/${nextDay.id}`;
    if (!graphs.has(key)) {
      const first = tracksByDay.get(firstDay.id) ?? [];
      const next = firstDay === nextDay ? [] : (tracksByDay.get(nextDay.id) ?? []);
      graphs.set(key, graphFor([...first, ...next]));
    }
    return graphs.get(key);
  };

  const events = days.flatMap((day, dayIndex) => eventsForDay(day, dayIndex, trip, defaultZone))
    .sort((left, right) => left.start - right.start || left.dayIndex - right.dayIndex || left.stopIndex - right.stopIndex);
  const origin = events[0]?.start ?? 0;
  const intervals = [];
  const ticks = [];
  const activities = [];
  const exactStops = new Map();
  const recordedDays = new Set();
  events.forEach((event, index) => {
    const { day, stop, start } = event;
    const previous = events[index - 1];
    const next = events[index + 1];
    const end = Math.min(event.end, next?.start ?? Infinity);
    const startPosition = stop.movementFromPrevious ? (previous?.stop.coordinates ?? stop.coordinates) : stop.coordinates;
    const endPosition = stop.movementToNext ? (next?.stop.coordinates ?? stop.coordinates) : stop.coordinates;
    const minute = start - origin;
    if (!recordedDays.has(day.id)) {
      ticks.push({ day, dayId: day.id, dayIndex: event.dayIndex, minute, date: event.date });
      recordedDays.add(day.id);
    }
    activities.push({ day, stop, minute });
    const loop = stop.movementLoopSegmentId ? findLoop(network(day), stop) : null;
    const movement = loop?.path ?? (startPosition !== endPosition ? findPath(network(day), startPosition, endPosition) : null);
    const stay = { kind: 'stop', start, end, event, next, previous, path: movement, position: startPosition };
    if (end > start || !next) {
      intervals.push(stay);
    } else if (start === event.end && start < next.start) {
      exactStops.set(start, stay);
    }
    if (!next || end >= next.start) return;
    const target = next.stop.movementFromPrevious ? stop.coordinates : next.stop.coordinates;
    const path = findPath(network(day, next.day), endPosition, target, loop?.anchor);
    intervals.push({
      kind: path ? 'travel' : 'rest', start: end, end: next.start,
      event, next, previous: event, path, position: endPosition,
    });
  });
  const maxMinute = (intervals.at(-1)?.end ?? origin) - origin;
  return { minMinute: 0, maxMinute, origin, ticks, activities, routesByDay, intervals, exactStops, days };
}

export function samplePlayback(model, minute) {
  if (!model?.intervals.length) return null;
  const relativeMinute = Math.min(model.maxMinute, Math.max(0, Number.isFinite(minute) ? minute : 0));
  const absoluteMinute = model.origin + relativeMinute;
  let first = 0;
  let last = model.intervals.length - 1;
  while (first < last) {
    const middle = Math.floor((first + last + 1) / 2);
    if (model.intervals[middle].start <= absoluteMinute) first = middle;
    else last = middle - 1;
  }
  const interval = model.exactStops.get(absoluteMinute) ?? model.intervals[first];
  const { start, end, event, next, previous, kind, path } = interval;
  const progress = end === start ? 0 : (absoluteMinute - start) / (end - start);
  const location = path ? evaluatePath(path, progress) : { position: interval.position };
  const stop = kind === 'travel' ? null : event.stop;
  const day = kind === 'travel' ? (location.route?.day ?? event.day) : event.day;
  const timeZone = kind === 'stop' ? event.arrivalZone : event.departureZone;
  return {
    minute: relativeMinute,
    day,
    dayIndex: day === event.day ? event.dayIndex : model.days.indexOf(day),
    kind,
    stop,
    fromStop: previous?.stop ?? null,
    nextStop: next?.stop ?? null,
    position: location.position,
    mode: location.route?.mode ?? null,
    name: kind === 'travel' ? `${event.stop.name} → ${next.stop.name}` : event.stop.name,
    note: kind === 'travel' ? (location.route?.label ?? '') : (event.stop.note ?? ''),
    approximate: path?.approximate ?? false,
    timeZone,
    ...localClock(absoluteMinute, timeZone),
    startMinute: start - model.origin,
    endMinute: end - model.origin,
    plannedDuration: event.end - event.start,
  };
}
