import { describe, expect, it } from 'vitest';
import { buildPlayback, getRouteLines, samplePlayback } from './playback.js';

function stop(id, arrival, departure, coordinates, extra = {}) {
  return { id, name: id, kind: 'attraction', arrival, departure, coordinates, ...extra };
}

function day(id, date, stops, segments = []) {
  return { id, date, stops, route: { segments } };
}

function geometry(points) {
  return { type: 'Feature', geometry: { type: 'LineString', coordinates: points.map(([lat, lng]) => [lng, lat]) } };
}

describe('itinerary playback', () => {
  it('uses absolute minutes for an overnight flight between time zones', () => {
    const first = day('departure', '2027-02-14', [stop('德里', '19:30', '20:20', [28.56, 77.11])], [
      { id: 'flight', mode: 'flight', coordinates: [[28.56, 77.11], [23.39, 113.30]] },
    ]);
    const second = day('arrival', '2027-02-15', [
      stop('广州', '04:15', '05:45', [23.39, 113.30], { timezone: 'Asia/Shanghai' }),
    ]);
    const playback = buildPlayback({ timezone: 'Asia/Kolkata', days: [first, second] });
    expect(playback.ticks.map((tick) => tick.minute)).toEqual([0, 375]);
    expect(samplePlayback(playback, 50)).toMatchObject({ kind: 'travel', mode: 'flight', time: '20:20' });
    expect(samplePlayback(playback, 375)).toMatchObject({
      kind: 'stop', time: '04:15', date: '2027-02-15', position: [23.39, 113.30],
    });
  });

  it('accounts for a change in daylight saving time', () => {
    const playback = buildPlayback({
      timezone: 'America/New_York',
      days: [day('day-1', '2027-03-14', [stop('纽约', '01:30', '03:30', [40.71, -74])])],
    });
    expect(playback.maxMinute).toBe(60);
    expect(samplePlayback(playback, 45).time).toBe('03:15');
  });

  it('keeps a traveler at their lodging overnight and yields to the next morning stop', () => {
    const first = day('day-1', '2027-01-26', [
      stop('酒店', '21:00', '08:30', [38, 140], { kind: 'lodging', departureDayOffset: 1 }),
    ]);
    const second = day('day-2', '2027-01-27', [stop('早餐', '08:15', '09:30', [38, 140])]);
    const playback = buildPlayback({ timezone: 'Asia/Tokyo', days: [first, second] });
    expect(samplePlayback(playback, 240)).toMatchObject({ kind: 'stop', stop: { id: '酒店' }, time: '01:00' });
    const nextDay = playback.ticks[1].minute;
    expect(samplePlayback(playback, nextDay - 1).stop.id).toBe('酒店');
    expect(samplePlayback(playback, nextDay).stop.id).toBe('早餐');
  });

  it('follows the curved official coordinates and reuses them for a return leg', () => {
    const coordinates = [[0, 0], [0.02, 0.02], [0, 0.04]];
    const segment = { id: 'rail', geometryFile: 'rail.json', mode: 'train', coordinates: [coordinates[0], coordinates[2]] };
    const dates = [day('day-1', '2027-01-26', [
      stop('甲站', '08:00', '08:30', coordinates[0]),
      stop('乙站', '09:30', '10:30', coordinates[2]),
      stop('甲站返回', '11:30', '12:00', coordinates[0]),
    ], [segment])];
    const map = new Map([['rail.json', geometry(coordinates)]]);
    expect(getRouteLines(segment, map)).toEqual([coordinates]);
    const playback = buildPlayback({ timezone: 'Asia/Tokyo', days: dates }, map);
    for (const minute of [60, 180]) {
      const sample = samplePlayback(playback, minute);
      expect(sample).toMatchObject({ kind: 'travel', mode: 'train', approximate: false });
      expect(sample.position[0]).toBeCloseTo(0.02, 5);
      expect(sample.position[1]).toBeCloseTo(0.02, 5);
    }
    expect(samplePlayback(playback, 100).nextStop.id).toBe('甲站返回');
  });

  it('connects route sections of different modes at an interchange', () => {
    const first = { id: 'train', geometryFile: 'first', mode: 'train' };
    const second = { id: 'walk', geometryFile: 'second', mode: 'walk' };
    const map = new Map([
      ['first', geometry([[0, 0], [0, 0.03]])],
      ['second', geometry([[0, 0.03], [0.015, 0.04], [0, 0.05]])],
    ]);
    const playback = buildPlayback({ days: [day('day-1', '2027-01-26', [
      stop('start', '08:00', '08:30', [0, 0]),
      stop('finish', '09:30', '10:00', [0, 0.05]),
    ], [first, second])] }, map);
    expect(samplePlayback(playback, 31)).toMatchObject({ mode: 'train', approximate: false });
    const secondMode = samplePlayback(playback, 60);
    expect(secondMode).toMatchObject({ mode: 'walk', approximate: false });
    expect(secondMode.position[0]).toBeGreaterThan(0.01);
  });

  it('moves through a timed tour loop and takes the exit afterwards', () => {
    const map = new Map([['tour.json', geometry([
      [0, -0.03], [0, 0], [0.02, 0.025], [0, 0], [0, 0.03],
    ])]]);
    const playback = buildPlayback({ days: [day('day-1', '2027-01-26', [
      stop('pickup', '08:00', '08:30', [0, -0.03]),
      stop('tour', '09:00', '10:00', [0, 0], { movementLoopSegmentId: 'tour' }),
      stop('station', '10:30', '11:00', [0, 0.03]),
    ], [{ id: 'tour', mode: 'bus', geometryFile: 'tour.json' }])] }, map);
    const midway = samplePlayback(playback, 90);
    expect(midway).toMatchObject({ kind: 'stop', stop: { id: 'tour' }, mode: 'bus' });
    expect(midway.position[0]).toBeCloseTo(0.02, 4);
    const after = samplePlayback(playback, 135);
    expect(after.position[0]).toBeCloseTo(0, 4);
    expect(after.position[1]).toBeCloseTo(0.015, 4);
  });

  it('labels the position between unmapped places as approximate', () => {
    const playback = buildPlayback({ days: [day('day-1', '2027-01-26', [
      stop('start', '08:00', '08:30', [0, 0]),
      stop('finish', '09:00', '10:00', [0, 0.05]),
    ])] });
    expect(samplePlayback(playback, 45)).toMatchObject({ kind: 'travel', approximate: true });
  });

  it('shows a zero-minute waypoint at the exact time when navigating to it', () => {
    const playback = buildPlayback({ days: [day('day-1', '2027-01-26', [
      stop('waypoint', '08:00', '08:00', [0, 0]),
      stop('finish', '09:00', '10:00', [0, 0.05]),
    ])] });
    expect(samplePlayback(playback, 0)).toMatchObject({ kind: 'stop', stop: { id: 'waypoint' } });
    expect(samplePlayback(playback, 1)).toMatchObject({ kind: 'travel' });
  });

  it('skips a day without valid activities', () => {
    const playback = buildPlayback({ days: [{ id: 'incomplete', stops: [] }] });
    expect(playback.ticks).toEqual([]);
    expect(samplePlayback(playback, 0)).toBeNull();
  });
});
