import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTrip } from '../src/lib/trip.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tripsDirectory = resolve(root, 'public', 'data', 'trips');

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
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
      if (!Array.isArray(day.route?.geometry) || day.route.geometry.length < 2) {
        errors.push(`${entry.file}: 第 ${dayIndex + 1} 天至少需要两个路线坐标`);
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
