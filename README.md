# 行程画布

一个把旅行路线、逐站时间、住宿安排与费用预算放在同一页面上的静态旅行规划系统。

当前版本是一套可扩展框架，默认展示 2026 阿勒泰—喀什双段自驾，同时保留一份明确标注为演示数据的川西 4 日行程。行程通过 JSON 文件录入，不需要修改地图或预算组件。

公网地址：<https://gnailegoac.github.io/travel-planning-system/>

## 已实现

- 自绘 3D 路线地图、可拖动的播放时间轴和随时间移动的旅行者。侧栏同步显示活动时间、说明及可用照片。
- 每个停靠点的到达、离开和自动计算的停留时间。
- 每日交通方式、里程、在途时间和活动说明。
- 可展开的行程关键决策、取舍说明与触发式应变预案。
- 每晚酒店、入住/退房、房间数与预订状态。
- 总预算、人均预算、机动金、分类占比和逐项费用。
- 多行程目录、数据加载错误提示、结构校验与单元测试。
- 电脑和 iPad 地图与活动双栏布局，小屏按顺序排列。通过 GitHub Pages 自动部署。

## 本地运行

```powershell
npm install
npm run dev
```

提交或发布前执行完整检查：

```powershell
npm run check
```

启动本地预览后，运行 `npm run test:browser` 可验收播放、时间轴和 iPad 布局。可用 `npx playwright-core install webkit` 安装平板测试使用的 WebKit。

## 新增一份具体行程

1. 复制 `public/data/trips/demo-west-sichuan.json`，用小写英文和连字符命名，例如 `chengdu-yunnan-2026.json`。
2. 修改根级信息、`days`、`stops`、`lodging` 与 `budget.items`；需要时增加 `keyDecisions` 和 `fallbackPlans`。
3. 在 `public/data/trips/index.json` 的 `trips` 数组中登记新文件；需要时修改 `defaultTripId`。
4. 把陆路轨迹的 GeoJSON 存放在 `public/data/routes/`，并在 `route.segments` 中引用 `geometryFile`。自驾段录入 `mode: "driving"`、`waypoints` 与 `geometryFile` 后，也可用命令生成：

   ```powershell
   npm run routes:fetch -- <trip-id>
   ```

5. 执行 `npm run validate:data`，再运行页面确认地图和时间线。

`incoming/` 用于暂存 Markdown 草稿并已被 Git 忽略；转换后的公开版本才放入 `public/data/trips/`。

核心数据约定见 [数据格式说明](docs/DATA_SCHEMA.md)。

## 地图与路线边界

3D 地图在 Canvas 中渲染本站提供的 Natural Earth 矢量底图、示意起伏和路线。道路、步行和铁路轨迹以静态 GeoJSON 存放在 `public/data/routes/`，由浏览器从本站读取。道路可在构建前通过 [OSRM Route service](https://project-osrm.org/docs/v5.24.0/api/#route-service) 生成。日本铁路轨迹采用日本国土交通省 2025 年度「国土数值信息・铁路数据」加工生成。航班与缺少详细轨迹的路段用虚线标注，播放位置为按规划时刻推算。

静态路线只是规划时快照，不包含实时路况、临时封路、季节性管制、施工、边防检查或车辆限行，也不提供逐向导航。出发当天仍应使用可靠的导航应用，并以交管、景区和现场指示为准；修改 `waypoints` 后要重新执行 `npm run routes:fetch -- <trip-id>` 并人工核对路线。

基于开放街图路网生成的轨迹保留 [OpenStreetMap contributors 署名](https://www.openstreetmap.org/copyright) 和数据反馈入口。公共 OSRM 实例用于低频生成。完整字段约定见 [数据格式说明](docs/DATA_SCHEMA.md)。

## 公共数据安全

`public/` 下的所有内容在部署后都可以被任何人读取。不要写入真实旅客姓名、身份证/护照号、手机号、完整订单号、二维码、房间号、支付信息或私密 API 密钥。需要私人协作与在线编辑时，再接入带身份验证的后端。

## 部署

`.github/workflows/deploy-pages.yml` 会在 `main` 分支推送后依次执行数据校验、测试、构建并发布 `dist/`。Vite 使用相对资源路径，因此可直接部署在 GitHub 项目站点子路径下。
