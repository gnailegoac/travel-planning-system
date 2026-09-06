# 行程画布

一个把旅行路线、逐站时间、住宿安排与费用预算放在同一页面上的静态旅行规划系统。

当前版本是一套可扩展框架，默认展示 2026 阿勒泰—喀什双段自驾，同时保留一份明确标注为演示数据的川西 4 日行程。行程通过 JSON 文件录入，不需要修改地图或预算组件。

公网地址：<https://gnailegoac.github.io/travel-planning-system/>

## 已实现

- 按天筛选的 Leaflet 路线地图、编号地点与地图弹窗；自驾段可沿预生成的道路几何显示。
- 每个停靠点的到达、离开和自动计算的停留时间。
- 每日交通方式、里程、在途时间和活动说明。
- 可展开的行程关键决策、取舍说明与触发式应变预案。
- 每晚酒店、入住/退房、房间数与预订状态。
- 总预算、人均预算、机动金、分类占比和逐项费用。
- 多行程目录、数据加载错误提示、结构校验与单元测试。
- 桌面和手机响应式布局，以及 GitHub Pages 自动部署。

## 本地运行

```powershell
npm install
npm run dev
```

提交或发布前执行完整检查：

```powershell
npm run check
```

## 新增一份具体行程

1. 复制 `public/data/trips/demo-west-sichuan.json`，用小写英文和连字符命名，例如 `chengdu-yunnan-2026.json`。
2. 修改根级信息、`days`、`stops`、`lodging` 与 `budget.items`；需要时增加 `keyDecisions` 和 `fallbackPlans`。
3. 在 `public/data/trips/index.json` 的 `trips` 数组中登记新文件；需要时修改 `defaultTripId`。
4. 自驾段需要道路形状时，在 `route.segments` 中录入 `mode: "driving"`、`waypoints` 与 `geometryFile`，然后生成静态路线文件：

   ```powershell
   npm run routes:fetch -- <trip-id>
   ```

5. 执行 `npm run validate:data`，再运行页面确认地图和时间线。

`incoming/` 用于暂存 Markdown 草稿并已被 Git 忽略；转换后的公开版本才放入 `public/data/trips/`。

核心数据约定见 [数据格式说明](docs/DATA_SCHEMA.md)。

## 地图与路线边界

地图使用 Leaflet 1.9.4 和 OpenStreetMap 标准瓦片。自驾段可以在构建前通过 [OSRM Route service](https://project-osrm.org/docs/v5.24.0/api/#route-service) 生成沿路网的 GeoJSON，并将快照提交到 `public/data/routes/`；页面只读取本站静态文件，不会让访客的浏览器临时请求路由服务。景区区间车、步行、航班等非自驾段仍使用录入坐标绘制虚线，以免被误解为道路导航。

静态路线只是规划时快照，不包含实时路况、临时封路、季节性管制、施工、边防检查或车辆限行，也不提供逐向导航。出发当天仍应使用可靠的导航应用，并以交管、景区和现场指示为准；修改 `waypoints` 后要重新执行 `npm run routes:fetch -- <trip-id>` 并人工核对路线。

路线数据和底图均须保留 [OpenStreetMap contributors 署名](https://www.openstreetmap.org/copyright)。公共 OSRM 实例只适合低频生成，不能作为生产环境的大批量或高并发路由服务；如果未来访问量扩大，应改用有服务保障的路由与地图瓦片供应商。完整字段约定见 [数据格式说明](docs/DATA_SCHEMA.md)。

## 公共数据安全

`public/` 下的所有内容在部署后都可以被任何人读取。不要写入真实旅客姓名、身份证/护照号、手机号、完整订单号、二维码、房间号、支付信息或私密 API 密钥。需要私人协作与在线编辑时，再接入带身份验证的后端。

## 部署

`.github/workflows/deploy-pages.yml` 会在 `main` 分支推送后依次执行数据校验、测试、构建并发布 `dist/`。Vite 使用相对资源路径，因此可直接部署在 GitHub 项目站点子路径下。
