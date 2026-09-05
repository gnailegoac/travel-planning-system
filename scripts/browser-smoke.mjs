import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const url = process.env.TRAVEL_APP_URL ?? 'http://127.0.0.1:4173';
const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

let executablePath;
for (const candidate of candidates) {
  try {
    await access(candidate);
    executablePath = candidate;
    break;
  } catch {
    // Try the next locally installed browser.
  }
}

if (!executablePath) throw new Error('没有找到可用于浏览器验收的 Chrome 或 Edge');

const outputDirectory = resolve('artifacts', 'browser');
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const scenarios = [
  { name: 'desktop', viewport: { width: 1366, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: scenario.viewport, deviceScaleFactor: 1 });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const location = message.location();
        errors.push(`console: ${message.text()}${location.url ? ` (${location.url})` : ''}`);
      }
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('.route-map.leaflet-container').waitFor();
    await page.locator('.leaflet-control-attribution').waitFor();
    await page.getByRole('button', { name: 'D2', exact: true }).click();
    await page.waitForTimeout(250);

    const visibleDayCards = await page.locator('.day-card').count();
    const visibleMarkers = await page.locator('.route-marker').count();
    if (visibleDayCards !== 1) errors.push(`D2 筛选后显示 ${visibleDayCards} 张日程卡，预期 1 张`);
    if (visibleMarkers !== 4) errors.push(`D2 筛选后显示 ${visibleMarkers} 个地图点，预期 4 个`);

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      title: document.title,
      attributionVisible: Boolean(document.querySelector('.leaflet-control-attribution')?.getClientRects().length),
    }));
    if (layout.scrollWidth > layout.clientWidth + 1) {
      errors.push(`页面横向溢出：${layout.scrollWidth}px > ${layout.clientWidth}px`);
    }
    if (!layout.attributionVisible) errors.push('地图署名不可见');
    if (!layout.title.includes('行程画布')) errors.push(`页面标题不正确：${layout.title}`);

    await page.screenshot({
      path: resolve(outputDirectory, `${scenario.name}.png`),
      fullPage: true,
    });
    await page.close();

    if (errors.length) {
      throw new Error(`${scenario.name} 验收失败：\n${errors.map((error) => `- ${error}`).join('\n')}`);
    }
    console.log(`${scenario.name} 浏览器验收通过`);
  }
} finally {
  await browser.close();
}
