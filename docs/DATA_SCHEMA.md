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
- `days`：逐日计划。
- `budget`：预算配置和预算项。

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
    "geometry": [[30.57, 104.06], [30.10, 103.00]]
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

时间采用当地 `HH:MM`。跨午夜的停靠点增加 `departureDayOffset: 1`；尚未确认的航班、班次或开放时段可用 `timeStatus` 明确标记。当前普通坐标和路线坐标均使用 `[纬度, 经度]`，与原生 GeoJSON 的 `[经度, 纬度]` 顺序不同；未来若增加外部 GeoJSON 文件，会单独解析并校验。

`kind` 当前支持 `departure`、`arrival`、`attraction`、`meal`、`lodging`；其他值会以普通停靠点显示。

路线 `geometry` 为前端展示坐标。没有经过道路路由服务核验时，只应录入少量节点并继续标为“示意路线”，不能把它当作导航线路。

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
