# 行程数据格式

当前数据版本为 `schemaVersion: 1`，以单一币种、可公开分享的旅行方案为边界。

## 行程目录

`public/data/trips/index.json` 决定页面可以切换哪些行程：

```json
{
  "schemaVersion": 1,
  "defaultTripId": "trip-id",
  "trips": [
    {
      "id": "trip-id",
      "file": "trip-id.json",
      "title": "行程标题",
      "status": "draft",
      "startDate": "2026-10-01",
      "endDate": "2026-10-05"
    }
  ]
}
```

## 行程文件

根级字段：

- `id`、`title`、`subtitle`：唯一标识和展示文案。
- `status`、`statusLabel`、`notice`：数据状态和重要提醒。
- `timezone`、`currency`：时区与全程基础币种；首版只支持一个币种。
- `startDate`、`endDate`、`origin`、`destination`。
- `travelers`：`adults`、`children`、`seniors` 的人数，页面自动合计。
- `keyDecisions`：可选的关键安排、理由和取舍。
- `fallbackPlans`：可选的触发条件、调整方案和优先级。
- `preparation`、`sourceLinks`：出发前待办和公开参考来源。
- `days`：逐日计划。
- `budget`：预算配置和预算项。

关键决策与应变预案采用以下结构；两个数组都可以省略，缺失时页面不会显示空面板：

```json
{
  "keyDecisions": [
    {
      "id": "arrive-earlier",
      "decision": "提前一天抵达",
      "reason": "避开高峰并增加转场缓冲",
      "tradeoff": "首日只安排必要转场"
    }
  ],
  "fallbackPlans": [
    {
      "id": "mountain-road-closed",
      "trigger": "出发前确认山区道路关闭",
      "action": "留在起点城市并取消山区支线",
      "priority": "安全与按时返程优先"
    }
  ]
}
```

数组内的 `id` 必须各自唯一，其余三个展示字段均为必填。预案应写成可判断的触发条件和可直接执行的动作，不要只写笼统提醒。

## 每日与停靠点

```json
{
  "id": "day-1",
  "date": "2026-10-01",
  "title": "成都 → 目的地",
  "summary": "当天策略与节奏说明",
  "route": {
    "method": "自驾",
    "distanceKm": 260,
    "flightDistanceKm": 0,
    "durationMinutes": 280,
    "geometry": [[30.57, 104.06], [30.10, 103.00]],
    "segments": [
      {
        "id": "day-1-driving",
        "label": "机场 → 景区游客中心",
        "mode": "driving",
        "geometryFile": "data/routes/trip-id/day-1-driving.geojson",
        "waypoints": [[30.57, 104.06], [30.10, 103.00]]
      },
      {
        "id": "day-1-shuttle",
        "label": "游客中心 → 景区入口",
        "mode": "shuttle",
        "coordinates": [[30.10, 103.00], [30.08, 102.98]]
      }
    ]
  },
  "stops": [
    {
      "id": "unique-stop-id",
      "name": "地点名称",
      "kind": "attraction",
      "arrival": "10:00",
      "departure": "12:30",
      "coordinates": [30.10, 103.00],
      "timeStatus": "开放时间待确认",
      "note": "停留说明"
    }
  ],
  "lodging": {
    "name": "酒店名或待选区域",
    "area": "所在区域",
    "checkIn": "17:00",
    "checkOut": "08:30",
    "nights": 1,
    "rooms": 2,
    "status": "待预订"
  }
}
```

时间采用当地 `HH:MM`。跨午夜的停靠点增加 `departureDayOffset: 1`；尚未确认的航班、班次或开放时段可用 `timeStatus` 明确标记。

停靠点的 `coordinates`、旧版 `route.geometry`、分段路线的 `waypoints` 和 `coordinates` 均使用 `[纬度, 经度]`。`geometryFile` 指向的文件是标准 GeoJSON，因此其中的坐标顺序必须是 `[经度, 纬度]`；前端会在读取时转换，不要把两种顺序混用。

`kind` 当前支持 `departure`、`arrival`、`transport`、`attraction`、`meal`、`lodging`；其他值会以普通停靠点显示。

### 分段路线

`route.segments` 用于在同一天分别表达自驾、景区区间车、步行、航班等线路。每段都需要在当天唯一的 `id`、供页面展示的 `label` 和 `mode`。当前模式包括：

- `driving`：自驾；页面读取预生成的道路 GeoJSON，并以实线展示。
- `shuttle`：景区区间车。
- `walk`：步行。
- `flight`：航班。
- `taxi`：出租车或网约车。

自驾段使用以下两个字段：

- `waypoints`：两个或更多用于请求路由的节点，顺序为 `[纬度, 经度]`。它们也是道路文件无法加载时的简化回退线，不应密集录入整条道路轨迹。
- `geometryFile`：相对于 `public/` 的 GeoJSON 路径，例如 `data/routes/trip-id/day-1-driving.geojson`。文件由生成脚本写入，几何须为 `LineString` 或 `MultiLineString`。

区间车、步行、航班和出租车等非自驾段不请求道路路由，直接使用 `coordinates`，至少包含两个 `[纬度, 经度]` 节点。它们在地图中使用虚线，以表达连接关系而不是可执行导航。

如果没有 `segments`，页面继续使用 `route.geometry` 作为兼容的整日示意线。没有经过道路路由服务生成并人工核验的 `geometry` 或 `coordinates`，都不能标作道路导航线路。

### 生成自驾道路文件

录入或修改自驾段后，在项目根目录运行：

```powershell
npm run routes:fetch -- <trip-id>
```

脚本会读取该行程全部 `mode: "driving"` 的分段，用 `waypoints` 请求 OSRM，随后把标准 GeoJSON 快照写到相应的 `geometryFile`。不传行程 ID时会处理目录中的全部行程。生成后应检查道路走向、距离和跨区绕行是否合理，并将 JSON 与 GeoJSON 一起提交；最后运行 `npm run validate:data`。

生成动作发生在开发/构建准备阶段，部署后的浏览器只读取静态 GeoJSON，不会实时调用 OSRM。文件中的生成时间、距离和时长也只是生成当时基于 OpenStreetMap 路网的估算，不含实时交通、封路、施工、季节管制或现场准入信息，不能替代出发当天的导航与官方通知。

页面和衍生路线文件必须保留 `© OpenStreetMap contributors` 署名。默认公共 OSRM 实例仅用于少量、低频的路线预生成；需要批量刷新、稳定服务或商业 SLA 时，应使用自托管实例或正式供应商。

## 预算

```json
{
  "contingencyRate": 0.1,
  "items": [
    {
      "id": "hotel-night-1",
      "dayId": "day-1",
      "category": "lodging",
      "name": "第一晚住宿",
      "quantity": 2,
      "unitAmount": 420,
      "actualAmount": null,
      "status": "待确认",
      "note": "2 间房"
    }
  ]
}
```

预计金额由 `quantity × unitAmount` 自动计算。如果录入数值型 `actualAmount`，预算投影会优先使用实际金额。尚未取得报价时将 `unitAmount` 设为 `null`，页面会显示“待补充”，不会误计成零元。`dayId` 可留空，非空时必须引用一个真实日期。分类支持：

- `transport`：交通
- `lodging`：住宿
- `food`：餐饮
- `tickets`：门票
- `shopping`：购物
- `other`：其他

机动金按所有预算项投影金额乘以 `contingencyRate` 计算；人均预算按旅客总数计算。
