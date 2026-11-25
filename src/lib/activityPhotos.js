// Photos are stored with the site so playback does not need to fetch outside image hosts.
const photos = {
  "hemu-september": {
    caption: "禾木河谷 · 9 月实景",
    alt: "秋天刚开始转黄的禾木河谷和村落",
    credit: "Bohao Zhao Tongfei",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Hemu_River_and_Mongolian_Village.jpg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  "kanas-september": {
    caption: "喀纳斯湖 · 9 月秋景",
    alt: "秋色中的喀纳斯湖，远山已有少量积雪",
    credit: "Charlie fong",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%E5%96%80%E7%BA%B3%E6%96%AF%E6%B9%96.jpg",
    license: "公有领域",
    licenseUrl: "https://commons.wikimedia.org/wiki/File:%E5%96%80%E7%BA%B3%E6%96%AF%E6%B9%96.jpg#Licensing",
  },
  kashgar: {
    caption: "喀什古城汗巴扎",
    alt: "黄昏时分的喀什古城汗巴扎入口",
    credit: "N509FZ",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Gate_of_Khan_Bazaar,_Ancient_City_of_Kashi_(20230923191916).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  whitesand: {
    caption: "帕米尔白沙湖",
    alt: "帕米尔白沙湖及湖岸",
    credit: "rheins",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%E5%B8%83%E4%BC%A6%E5%8F%A3%E6%B0%B4%E5%BA%93(%E7%99%BD%E6%B2%99%E6%B9%96)_-_Bulungkol_Reservoir_(White_Sand_Lake)_-_2015.04_-_panoramio.jpg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
  },
  "karakul-september": {
    caption: "喀拉库勒湖与公格尔峰 · 9 月秋景",
    alt: "秋日的喀拉库勒湖映出公格尔峰和云层",
    credit: "Jialiang Gao",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Mt_Kongur_Lake_Karakul_Xinjiang_China.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  "sendai-arrivals": {
    caption: "仙台机场航站楼内部",
    alt: "仙台机场国内到达大厅",
    credit: "Ellerad",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:SendaiAirport-Domestic-ArrivalArea.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "aomori-snow": {
    caption: "冬日青森湾 · 青海公园",
    alt: "青森湾边积雪覆盖的青海公园",
    credit: "掬茶",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aoiumi_Park_in_snow_20250112b.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  stovetrain: {
    caption: "津轻铁路暖炉列车",
    alt: "津轻暖炉列车车厢内的暖炉和乘客",
    credit: "Kotaro（耕太郎）",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tsugaru_Railway_Stove_Train.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "towada-museum": {
    caption: "十和田市现代美术馆馆舍",
    alt: "枝叶未发的树木与白色馆舍",
    credit: "re-kuma",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:090315%E5%8D%81%E5%92%8C%E7%94%B0%E5%B8%82%E7%8F%BE%E4%BB%A3%E7%BE%8E%E8%A1%93%E9%A4%A8_-_panoramio.jpg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  "oirase-winter": {
    caption: "奥入濑溪流冬季冰瀑",
    alt: "积雪覆盖的奥入濑溪流和冰封的瀑布",
    credit: "Amazing AOMORI（青森县观光图库）",
    sourceUrl: "https://aomori-tourism.com/en/photos/detail_8705.html",
    license: "图库使用条款",
    licenseUrl: "https://aomori-tourism.com/en/photos/detail_8705.html#terms",
  },
  zaosummit: {
    caption: "藏王树冰",
    alt: "藏王山顶被冰雪包裹的树林",
    credit: "Wikimedia Commons（原作者未署名）",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%E5%B1%B1%E5%BD%A2%E7%9C%8C_%E8%94%B5%E7%8E%8B%E6%B8%A9%E6%B3%89%E3%82%B9%E3%82%AD%E3%83%BC%E5%A0%B4_%E6%A8%B9%E6%B0%B7_M.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
  },
  zaoski: {
    caption: "藏王温泉滑雪场",
    alt: "藏王温泉滑雪场的雪坡",
    credit: "Mamusi Taka",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:2012%E8%94%B5%E7%8E%8B%E3%82%B9%E3%82%AD%E3%83%BC_-_panoramio_(1).jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
  },
  "kaminoyama-snow": {
    caption: "上山温泉明月庄 · 1 月雪景",
    alt: "积雪覆盖的上山温泉明月庄旅馆",
    credit: "Kentaro Matsui",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Meigetsu-so.JPG",
    license: "公有领域",
    licenseUrl: "https://commons.wikimedia.org/wiki/File:Meigetsu-so.JPG#Licensing",
  },
  delhi: {
    caption: "德里机场第三航站楼",
    alt: "德里机场第三航站楼",
    credit: "Ravi Dwivedi",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Delhi_airport_terminal_3.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "pench-february": {
    caption: "彭奇国家公园 · 2 月拍摄的孟加拉虎",
    alt: "二月在彭奇国家公园林间出现的孟加拉虎",
    credit: "Fitindia",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Karmazari_Pench_National_Park_11.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  "pench-owl-february": {
    caption: "彭奇国家公园 · 2 月拍摄的鸮",
    alt: "彭奇国家公园栖在树干上的鸮",
    credit: "Daemonkane",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Owl_in_Pench_National_Park%2C_India.jpg",
    license: "公有领域",
    licenseUrl: "https://commons.wikimedia.org/wiki/File:Owl_in_Pench_National_Park%2C_India.jpg#Licensing",
  },
  "kanha-tiger-february": {
    caption: "坎哈国家公园 · 2 月拍摄的孟加拉虎",
    alt: "二月在坎哈国家公园林地卧伏的孟加拉虎",
    credit: "A. J. T. Johnsingh, WWF-India and NCF",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tiger_Kanha_TR%2C_AJTJohnsingh_._DSC01420.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  kanhajeep: {
    caption: "坎哈国家公园 · 吉普观兽",
    alt: "坎哈国家公园林地的观兽吉普车",
    credit: "Ayontalukdar",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kanha_National_Park_jeep_safari.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  kangding: {
    caption: "康定城区",
    alt: "山谷中的康定城区",
    credit: "NoGhost",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kangding_from_above.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "xinduqiao-july-approach": {
    caption: "折多山向新都桥眺望 · 7 月夏景",
    alt: "七月从折多山垭口俯瞰新都桥方向的山谷",
    credit: "xue siyang (df45086)",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%E5%B7%A1%E9%81%93%E5%B7%A5%E5%87%BA%E5%93%81_Photo_by_Xundaogong_%E9%AA%91%E8%A1%8C%E5%B7%9D%E8%97%8F%E7%BA%BF_%E5%BA%B7%E5%AE%9A-%E6%96%B0%E9%83%BD%E6%A1%A5_%E6%8A%98%E5%A4%9A%E5%B1%B1%E5%9E%AD%E5%8F%A3%E7%9C%8B%E6%96%B0%E9%83%BD%E6%A1%A5%E6%96%B9%E5%90%91_-_panoramio.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  tagong: {
    caption: "塔公草原",
    alt: "川西塔公草原的开阔山地",
    credit: "Valerian Guillot",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Grasslands_in_Tagong_county,_Sichuan,_China_(41077322430).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
  },
  danba: {
    caption: "丹巴甲居藏寨",
    alt: "丹巴山间的甲居藏族村寨",
    credit: "Nyx Ning",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%E5%9B%9B%E5%B7%9D_%E4%B8%B9%E5%B7%B4-%E7%94%B2%E5%B1%85-%E8%97%8F%E5%AF%A8_-_panoramio.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
  },
  hongkong: {
    caption: "香港机场第二航站楼值机区（历史照片）",
    alt: "改造前的香港国际机场第二航站楼值机区域",
    credit: "Wpcpey",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Hong_Kong_International_Airport_Terminal_2_Departure_checkin_2019.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  narita: {
    caption: "成田机场第一航站楼",
    alt: "成田机场第一航站楼内部",
    credit: "ウィ貴公子",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Interior_of_Narita_International_Airport_Terminal_1_20230130_090532.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  tokyo: {
    caption: "东京站丸之内站舍",
    alt: "东京站的红砖丸之内站舍",
    credit: "Alexandr3126",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tokyo_Station_(Marunouchi_Building).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "yamagata-station-concourse": {
    caption: "山形站站厅",
    alt: "山形站室内通道与电子站牌",
    credit: "MaedaAkihiko",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:JRE_Yamagata-STA_Concourse.jpg",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  "aomori-station-snow": {
    caption: "从青森站眺望青森湾大桥 · 1 月雪景",
    alt: "青森站站台旁积雪覆盖的铁轨与青森湾大桥",
    credit: "掬茶",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aomori_Bay_Bridge_seen_from_Aomori_Station_20250112a.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  nagpur: {
    caption: "那格浦尔机场",
    alt: "那格浦尔机场航站楼",
    credit: "Nikkul",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:NagpurAirport.JPG",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
  },
};

const tripRules = {
  'xinjiang-self-drive-2026': {
    match: [
      [/white-sand-lake|白沙湖/, 'whitesand'],
      [/karakul|喀拉库勒湖/, 'karakul-september'],
      [/kashgar-old-city|east-gate|喀什古城夜游|古城居民巷/, 'kashgar'],
      [/kanas-lake|喀纳斯湖/, 'kanas-september'],
      [/hemu-village|禾木桥|禾木老村|禾木晨景/, 'hemu-september'],
    ],
    nearby: [
      [/kashgar|id-kah|gaotai|喀什/, 'kashgar'],
      [/tashkurgan|panlong|wacha|bandier|oytak|石头城|塔县|帕米尔/, 'karakul-september'],
      [/kanas|jiadengyu|tiejia|baihaba|tireketi|shenxian|moon|喀纳斯|白哈巴/, 'kanas-september'],
    ],
    cover: 'hemu-september',
  },
  'japan-tohoku-family-2027': {
    match: [
      [/stove|暖炉列车/, 'stovetrain'],
      [/zao-summit|地藏山顶/, 'zaosummit'],
      [/towada-art|十和田现代美术馆（可选）/, 'towada-museum'],
      [/d4-oirase-tour|冰瀑导览/, 'oirase-winter'],
      [/sendai-airport|仙台机场/, 'sendai-arrivals'],
      [/d1-hkg|香港国际机场/, 'hongkong'],
      [/d7-tokyo|东京站/, 'tokyo'],
      [/d[45]-yamagata-bus|山形站东口/, 'yamagata-station-concourse'],
      [/d8-nrt|成田机场第 1 航站楼/, 'narita'],
    ],
    nearby: [
      [/d[4578]-(nrt2?|narita-hotel)|d8-hotel|成田/, 'narita'],
      [/d[45]-yamagata-hotel|山形大都会/, 'yamagata-station-concourse'],
      [/d[123]-aomori|青森站/, 'aomori-station-snow'],
      [/oirase|奥入濑/, 'oirase-winter'],
      [/d[56]-(snow|zao-|lunch)|藏王雪地|玩雪|藏王山麓/, 'zaoski'],
      [/kaminoyama|fujiya|上山温泉|藤屋/, 'kaminoyama-snow'],
      [/towada|十和田/, 'towada-museum'],
      [/sendai|仙台/, 'sendai-arrivals'],
    ],
    cover: 'aomori-snow',
  },
  'india-safari-family-2027': {
    match: [
      [/day-(?:3|5)-safari/, 'pench-february'],
      [/day-4-safari/, 'pench-owl-february'],
      [/day-(?:7|8|9)-safari/, 'kanhajeep'],
      [/day-1-del-arrival|德里机场国际出发/, 'delhi'],
      [/day-2-nag-arrival|day-11-nag-departure/, 'nagpur'],
    ],
    nearby: [
      [/nag-hotel|那格浦尔/, 'nagpur'],
      [/pench|kipling|彭奇|卡尔马吉里/, 'pench-owl-february'],
      [/kanha|坎哈|卡蒂亚|观兽/, 'kanha-tiger-february'],
      [/day-[34]-/, 'pench-owl-february'],
    ],
    cover: 'delhi',
  },
  'demo-west-sichuan': {
    match: [
      [/tagong|塔公草原|塔公午餐/, 'tagong'],
      [/danba-village|丹巴村落/, 'danba'],
      [/康定自由活动/, 'kangding'],
    ],
    nearby: [
      [/danba|丹巴/, 'danba'],
      [/bamei|tagong|八美|塔公/, 'tagong'],
      [/xinduqiao|新都桥|折多山/, 'xinduqiao-july-approach'],
    ],
    cover: 'kangding',
  },
};

function matchingPhoto(rules, text) {
  return rules.find(([pattern]) => pattern.test(text))?.[1];
}

export function getActivityPhoto(tripId, activity) {
  const stop = activity?.stop ?? activity;
  const photoInput = stop?.photo;
  const segments = typeof photoInput?.file === 'string' ? photoInput.file.split('/') : [];
  const localPhoto = segments[0] === 'data' && segments[1] === 'photos' && segments.length > 2
    && segments.every((segment) => segment && segment !== '.' && segment !== '..' && !/[\\?#]/.test(segment))
    && /\.(webp|jpe?g|png|avif)$/i.test(photoInput.file);
  if (localPhoto && typeof photoInput.alt === 'string' && photoInput.alt.trim()) {
    return {
      ...photoInput,
      src: import.meta.env.BASE_URL + segments.map(encodeURIComponent).join('/'),
      caption: photoInput.caption ?? photoInput.alt,
      sourceUrl: /^https:\/\//i.test(photoInput.sourceUrl ?? '') ? photoInput.sourceUrl : undefined,
      licenseUrl: /^https:\/\//i.test(photoInput.licenseUrl ?? '') ? photoInput.licenseUrl : undefined,
    };
  }
  const trip = tripRules[tripId];
  if (!trip) return null;
  const text = [stop?.id, stop?.name, stop?.title].filter(Boolean).join(' ');
  const exact = matchingPhoto(trip.match, text);
  const id = exact ?? matchingPhoto(trip.nearby, text) ?? trip.cover;
  const photo = photos[id];
  return {
    ...photo,
    src: `${import.meta.env.BASE_URL}data/photos/${id}.webp`,
    caption: exact ? photo.caption : `沿途参考 · ${photo.caption}`,
    representative: !exact,
    changes: '已缩放并转换为 WebP',
  };
}
