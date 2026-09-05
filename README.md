# 行程画布

一个把旅行路线、逐站时间、住宿安排与费用预算放在同一页面上的静态旅行规划系统。

当前版本是一套可扩展框架，默认展示 2026 阿勒泰—喀什双段自驾，同时保留一份明确标注为演示数据的川西 4 日行程。行程通过 JSON 文件录入，不需要修改地图或预算组件。

公网地址：<https://gnailegoac.github.io/travel-planning-system/>

## 已实现

- 按天筛选的 Leaflet 路线地图、编号地点与地图弹窗。
- 每个停靠点的到达、离开和自动计算的停留时间。
- 每日交通方式、里程、在途时间和活动说明。
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
2. 修改根级信息、`days`、`stops`、`lodging` 与 `budget.items`。
3. 在 `public/data/trips/index.json` 的 `trips` 数组中登记新文件；需要时修改 `defaultTripId`。
4. 执行 `npm run validate:data`，再运行页面确认地图和时间线。

`incoming/` 用于暂存 Markdown 草稿并已被 Git 忽略；转换后的公开版本才放入 `public/data/trips/`。

核心数据约定见 [数据格式说明](docs/DATA_SCHEMA.md)。

## 地图与路线边界

首版地图使用 Leaflet 1.9.4 和 OpenStreetMap 标准瓦片。演示路线只是录入地点之间的虚线，不是道路导航，也不会在浏览器里请求路由或地理编码 API。正式行程可以把 `days[].route.geometry` 替换为预先生成并核验过的路线坐标；如果未来访问量扩大，应改用有服务保障的地图瓦片供应商。

页面必须保留 OpenStreetMap 署名，不要批量预取或下载标准瓦片。

## 公共数据安全

`public/` 下的所有内容在部署后都可以被任何人读取。不要写入真实旅客姓名、身份证/护照号、手机号、完整订单号、二维码、房间号、支付信息或私密 API 密钥。需要私人协作与在线编辑时，再接入带身份验证的后端。

## 部署

`.github/workflows/deploy-pages.yml` 会在 `main` 分支推送后依次执行数据校验、测试、构建并发布 `dist/`。Vite 使用相对资源路径，因此可直接部署在 GitHub 项目站点子路径下。
