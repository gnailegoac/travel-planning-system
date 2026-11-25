import assert from 'node:assert/strict';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, devices, webkit } from 'playwright-core';

const baseUrl = process.env.TRAVEL_APP_URL ?? 'http://127.0.0.1:4173';
const outputDirectory = resolve('artifacts', 'browser');
const chromeCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

async function available(path) {
  try { await access(path); return true; } catch { return false; }
}

function tripUrl(trip, day) {
  const url = new URL(baseUrl);
  if (trip) url.searchParams.set('trip', trip);
  if (day) url.searchParams.set('day', day);
  return url.toString();
}

function monitor(page) {
  const errors = [];
  const routes = new Set();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    if (response.ok() && response.url().includes('/data/routes/')) {
      routes.add(new URL(response.url()).pathname.split('/').at(-1));
    }
  });
  return { errors, routes };
}

async function waitForMap(page) {
  const map = page.locator('.journey-map[data-basemap="ready"]');
  await map.waitFor();
  await page.locator('.journey-traveler').waitFor();
  await page.locator('.map-load-status').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('.activity-photo img')?.naturalWidth > 0);
  assert.ok(Number(await map.getAttribute('data-route-count')) > 0);
  return map;
}

async function position(map) {
  const coordinates = await map.evaluate((map) => [
    Number(map.dataset.travelerLat),
    Number(map.dataset.travelerLng),
  ]);
  assert.ok(coordinates.every(Number.isFinite));
  return coordinates;
}

async function checkLayout(page, minStageHeight = 300) {
  const layout = await page.evaluate(() => {
    const map = document.querySelector('.journey-map-frame').getBoundingClientRect();
    const tools = document.querySelector('.journey-map-tools').getBoundingClientRect();
    const side = document.querySelector('.journey-activity-panel').getBoundingClientRect();
    const timeline = document.querySelector('.journey-player-controls').getBoundingClientRect();
    const lastRow = document.querySelector('.journey-map-sources')?.getBoundingClientRect() ?? timeline;
    const root = document.documentElement;
    return {
      overflow: root.scrollWidth - root.clientWidth,
      verticalOverflow: root.scrollHeight - root.clientHeight,
      sideBySide: side.left > map.right && Math.abs(side.top - map.top) < 2,
      stageHeight: map.height,
      panelsAligned: Math.abs(map.bottom - side.bottom) < 2,
      controlsInView: tools.bottom <= map.bottom && timeline.bottom <= innerHeight,
      freeSpaceBelow: innerHeight - lastRow.bottom,
      title: document.title,
    };
  });
  const actual = JSON.stringify(layout);
  assert.ok(layout.overflow <= 1 && layout.verticalOverflow <= 1, actual);
  assert.ok(layout.sideBySide && layout.panelsAligned, actual);
  assert.ok(layout.stageHeight >= minStageHeight, actual);
  assert.ok(layout.controlsInView && layout.freeSpaceBelow <= 18, actual);
  assert.ok(layout.title.includes('行程画布'));
}

async function waitForCenteredTraveler(page) {
  await page.waitForFunction(() => {
    const map = document.querySelector('.journey-map');
    const traveler = map.querySelector('.journey-traveler');
    if (map.dataset.following !== 'true' || !traveler) return false;
    const region = map.getBoundingClientRect();
    const person = traveler.getBoundingClientRect();
    return Math.abs((person.left + person.width / 2 - region.left) / region.width - 0.5) < 0.08
      && Math.abs((person.bottom - region.top) / region.height - 0.5) < 0.16;
  });
}

async function verifyDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const capture = monitor(page);
  try {
    await page.goto(tripUrl(), { waitUntil: 'networkidle' });
    await waitForMap(page);
    assert.ok(capture.routes.has('day-2-driving.geojson'), '新疆日期的道路轨迹未加载');
    assert.match(await page.locator('.activity-photo figcaption').innerText(), /秋|9\s*月/, '北疆秋季行程的配图未标明秋景');
    await checkLayout(page, 500);
    await page.screenshot({ path: resolve(outputDirectory, 'journey-desktop.png') });

    await page.goto(tripUrl('japan-tohoku-family-2027', 'day-4'), { waitUntil: 'networkidle' });
    const map = await waitForMap(page);
    assert.ok(capture.routes.has('road-d4-oirase-tour.geojson'));
    const slider = page.getByRole('slider', { name: '拖动行程时间' });
    const start = Number(await slider.getAttribute('min'));
    await slider.fill(String(start + 235)); // 13:55 JST
    assert.match(await page.getByTestId('activity-name').innerText(), /奥入濑溪流馆与冰瀑导览/);
    assert.match(await page.locator('.activity-photo figcaption').innerText(), /冰瀑|冬季/, '冰瀑活动未使用冬季配图');
    const early = await position(map);
    await slider.fill(String(start + 300)); // 15:00 JST
    assert.match(await page.getByTestId('activity-name').innerText(), /奥入濑溪流馆与冰瀑导览/);
    const later = await position(map);
    assert.ok(Math.hypot(later[0] - early[0], later[1] - early[1]) > 0.015, '人物未沿冰瀑团路线移动');
    const mapBox = await map.boundingBox();
    const formerCenter = await map.getAttribute('data-view-lng');
    await page.mouse.move(mapBox.x + mapBox.width * 0.25, mapBox.y + mapBox.height * 0.65);
    await page.mouse.down();
    await page.mouse.move(mapBox.x + mapBox.width * 0.55, mapBox.y + mapBox.height * 0.65, { steps: 5 });
    await page.mouse.up();
    assert.notEqual(await map.getAttribute('data-view-lng'), formerCenter, '测试前未移开地图视角');
    await page.getByRole('button', { name: '播放行程' }).click();
    await waitForCenteredTraveler(page);
    await page.waitForFunction((start) => document.querySelector('input[type=range]').valueAsNumber > start + 317, start);
    await waitForCenteredTraveler(page);
    await page.getByRole('button', { name: '暂停播放' }).click();
    const paused = await slider.inputValue();
    const pausedCenter = await map.getAttribute('data-view-lng');
    await page.waitForTimeout(120);
    assert.equal(await slider.inputValue(), paused);
    assert.equal(await map.getAttribute('data-view-lng'), pausedCenter);
    const track = await slider.boundingBox();
    const maximum = Number(await slider.getAttribute('max'));
    const thumb = track.x + 10 + (Number(paused) - start) / (maximum - start) * (track.width - 20);
    await page.mouse.move(thumb, track.y + track.height / 2);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width * 0.75, track.y + track.height / 2, { steps: 8 });
    await page.mouse.up();
    assert.ok(Number(await slider.inputValue()) > Number(paused) + 100, '鼠标拖动没有推进时间轴');
    const pitch = await map.getAttribute('data-pitch');
    await page.getByRole('button', { name: '三维视角' }).click();
    assert.notEqual(await map.getAttribute('data-pitch'), pitch);
    await page.getByRole('button', { name: '查看全程' }).click();
    assert.ok(Number(await map.getAttribute('data-route-count')) > 25);
    await page.getByRole('button', { name: '播放行程' }).click();
    await waitForCenteredTraveler(page);
    assert.equal(await page.getByRole('button', { name: '查看全程' }).getAttribute('aria-pressed'), 'false');
    await page.getByRole('button', { name: '暂停播放' }).click();

    await page.getByRole('button', { name: '行程明细' }).click();
    assert.equal(await page.locator('.lodging-card:visible').count(), 7);
    assert.match(await page.locator('.budget-total-card strong').innerText(), /52,058/);
    assert.equal(await page.locator('.day-card:visible').count(), 1, '日期直达链接未保留');
    await page.getByLabel('查看日期').selectOption('all');
    assert.equal(await page.locator('.day-card:visible').count(), 8);

    await page.getByLabel('切换行程').selectOption('india-safari-family-2027');
    await page.getByRole('heading', { name: /印度亲子野生动物之旅/ }).waitFor();
    assert.equal(await page.locator('.day-card:visible').count(), 12);
    assert.equal(await page.locator('.demo-notice:visible').count(), 0);
    assert.deepEqual(capture.errors, []);
    console.log('电脑 Chrome 通过，包括播放、定位、照片和行程明细');
  } finally {
    await page.close();
  }
}

async function verifyTablet(browser, label) {
  for (const [orientation, minStageHeight] of [
    ['iPad Mini', 600],
    ['iPad Mini landscape', 445],
    ['iPad Pro 11', 755],
    ['iPad (gen 11) landscape', 355],
  ]) {
    const { defaultBrowserType, ...device } = devices[orientation];
    const page = await browser.newPage(device);
    const capture = monitor(page);
    try {
      await page.goto(tripUrl('japan-tohoku-family-2027', 'day-6'), { waitUntil: 'networkidle' });
      const map = await waitForMap(page);
      await checkLayout(page, minStageHeight);
      assert.match(await page.getByTestId('activity-name').innerText(), /藤屋旅馆早餐/);
      const slider = page.getByRole('slider', { name: '拖动行程时间' });
      const track = await slider.boundingBox();
      await slider.tap({ position: { x: track.width * 0.27, y: track.height / 2 } });
      assert.notDeepEqual(await position(map), [38.152369, 140.264156], '触摸时间轴未更新地图人物');
      await page.getByRole('button', { name: '查看全程' }).tap();
      await page.getByRole('button', { name: '播放行程' }).tap();
      await waitForCenteredTraveler(page);
      await page.getByRole('button', { name: '暂停播放' }).tap();
      await page.getByRole('button', { name: /^第4天，/ }).tap();
      assert.match(await page.getByTestId('activity-name').innerText(), /十和田现代美术馆/);
      await page.waitForFunction(() => document.querySelector('.activity-photo img')?.naturalWidth > 0);
      assert.deepEqual(capture.errors, []);
      await page.screenshot({ path: resolve(outputDirectory, 'journey-' + orientation.toLowerCase().replaceAll(' ', '-') + '.png') });
      console.log(orientation + ' ' + label + ' 通过，包括两栏布局、触控时间轴和图文切换');
    } finally {
      await page.close();
    }
  }
}

let executablePath;
for (const path of chromeCandidates) {
  if (await available(path)) {
    executablePath = path;
    break;
  }
}
if (!executablePath) throw new Error('没有找到可用于浏览器验收的 Chrome 或 Edge');
await mkdir(outputDirectory, { recursive: true });
const chrome = await chromium.launch({ executablePath, headless: true });
try {
  await verifyDesktop(chrome);
  if (await available(webkit.executablePath())) {
    const safariEngine = await webkit.launch({ headless: true });
    try { await verifyTablet(safariEngine, 'WebKit'); } finally { await safariEngine.close(); }
  } else {
    await verifyTablet(chrome, 'Chromium');
  }
} finally {
  await chrome.close();
}
