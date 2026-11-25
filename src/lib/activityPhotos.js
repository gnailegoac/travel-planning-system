// Photos are stored with the site so playback does not need to fetch outside image hosts.
const photos = {
  hemuvillage: {
    caption: "禾木河谷",
    alt: "禾木河谷的村落与群山",
    credit: "CatOnMars",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:DSC_-_Altay_-_Hemu_Valley_1.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
  },
  kanaslake: {
    caption: "喀纳斯湖",
    alt: "喀纳斯湖与两岸森林",
    credit: "CatOnMars",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:DSC_-_Altay_-_Khanas_Lake_-_Lake_View.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
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
  karakul: {
    caption: "喀拉库勒湖与慕士塔格峰",
    alt: "帕米尔高原上的喀拉库勒湖和慕士塔格峰",
    credit: "Yoshi Canopus",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Karakul_Lake_-_Muztag_Ata,_China.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
  },
  sendai: {
    caption: "仙台机场航站楼",
    alt: "仙台机场航站楼",
    credit: "MIKI Yoshihito",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Sendai_Airport_terminal_2017-08-29_(36424770174).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
  },
  aomori: {
    caption: "青森湾",
    alt: "青森湾海面与岸边堤道",
    credit: "Mccunicano",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aomori_Bay_panorama.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  stovetrain: {
    caption: "津轻铁路暖炉列车",
    alt: "津轻暖炉列车车厢内的暖炉和乘客",
    credit: "Kotaro（耕太郎）",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tsugaru_Railway_Stove_Train.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  towada: {
    caption: "十和田市现代美术馆",
    alt: "十和田市现代美术馆的外建筑",
    credit: "Coffee1000mg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Towada_Art_Center_in_Aomori.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
  },
  oirase: {
    caption: "奥入濑溪流（暖季实景）",
    alt: "林间流淌的奥入濑溪流",
    credit: "Naokijp",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:2021_Oirase_Mountain_Stream_002.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
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
  kaminoyama: {
    caption: "上山温泉街的下大汤",
    alt: "山形县上山温泉街的公共浴场下大汤",
    credit: "Suikotei",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kaminoyama_Onsen_Shimo-Oyu.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
  },
  delhi: {
    caption: "德里机场第三航站楼",
    alt: "德里机场第三航站楼",
    credit: "Ravi Dwivedi",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Delhi_airport_terminal_3.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  pench: {
    caption: "彭奇国家公园 · 亚洲野犬",
    alt: "彭奇国家公园内的亚洲野犬",
    credit: "Rohit Sharma",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Dhole_Stroll_at_Pench_National_Park,_India.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  penchbird: {
    caption: "彭奇国家公园 · 印度孔雀",
    alt: "彭奇国家公园中开屏的印度孔雀",
    credit: "Rohit Sharma",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Indian_Peacock_courtship_display_at_Pench_national_park_(April,_2024)_08.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  kanhatiger: {
    caption: "坎哈国家公园 · 孟加拉虎",
    alt: "坎哈国家公园内的孟加拉虎",
    credit: "Bernard Gagnon",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Bengal_tiger_in_Kanha_National_Park_02.jpg",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0",
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
  xinduqiao: {
    caption: "新都桥",
    alt: "新都桥一带的山谷与村庄",
    credit: "rheins",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%E6%96%B0%E9%83%BD%E6%A1%A5%E7%BE%8E%E6%99%AF_-_Scenary_of_Xinduqiao_Town_-_2012.10_-_panoramio.jpg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
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
  yamagata: {
    caption: "山形站东口",
    alt: "山形站东口",
    credit: "Mister0124",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:JR_East_Yamagata_Station_East_Exit,_Yamagata_Pref.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  aomoristation: {
    caption: "青森站西口",
    alt: "青森站西口建筑",
    credit: "Mccunicano",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aomori_Station_West_Entrance_(March_2021).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
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
      [/karakul|喀拉库勒湖/, 'karakul'],
      [/kashgar-old-city|east-gate|喀什古城夜游|古城居民巷/, 'kashgar'],
      [/kanas-lake|喀纳斯湖/, 'kanaslake'],
      [/hemu-village|禾木桥|禾木老村|禾木晨景/, 'hemuvillage'],
    ],
    nearby: [
      [/kashgar|id-kah|gaotai|喀什/, 'kashgar'],
      [/tashkurgan|panlong|wacha|bandier|oytak|石头城|塔县|帕米尔/, 'karakul'],
      [/kanas|jiadengyu|tiejia|baihaba|tireketi|shenxian|moon|喀纳斯|白哈巴/, 'kanaslake'],
    ],
    cover: 'hemuvillage',
  },
  'japan-tohoku-family-2027': {
    match: [
      [/stove|暖炉列车/, 'stovetrain'],
      [/zao-summit|地藏山顶/, 'zaosummit'],
      [/towada-art|十和田现代美术馆（可选）/, 'towada'],
      [/sendai-airport|仙台机场/, 'sendai'],
      [/d1-hkg|香港国际机场/, 'hongkong'],
      [/d7-tokyo|东京站/, 'tokyo'],
      [/d[45]-yamagata-bus|山形站东口/, 'yamagata'],
      [/d8-nrt|成田机场第 1 航站楼/, 'narita'],
    ],
    nearby: [
      [/d[4578]-(nrt2?|narita-hotel)|d8-hotel|成田/, 'narita'],
      [/d[45]-yamagata-hotel|山形大都会/, 'yamagata'],
      [/d[123]-aomori|青森站/, 'aomoristation'],
      [/oirase|奥入濑/, 'oirase'],
      [/d[56]-(snow|zao-|lunch)|藏王雪地|玩雪|藏王山麓/, 'zaoski'],
      [/kaminoyama|fujiya|上山温泉|藤屋/, 'kaminoyama'],
      [/towada|十和田/, 'towada'],
      [/sendai|仙台/, 'sendai'],
    ],
    cover: 'aomori',
  },
  'india-safari-family-2027': {
    match: [
      [/day-(?:3|5)-safari/, 'pench'],
      [/day-4-safari/, 'penchbird'],
      [/day-(?:7|8|9)-safari/, 'kanhajeep'],
      [/day-1-del-arrival|德里机场国际出发/, 'delhi'],
      [/day-2-nag-arrival|day-11-nag-departure/, 'nagpur'],
    ],
    nearby: [
      [/nag-hotel|那格浦尔/, 'nagpur'],
      [/pench|kipling|彭奇|卡尔马吉里/, 'penchbird'],
      [/kanha|坎哈|卡蒂亚|观兽/, 'kanhatiger'],
      [/day-[34]-/, 'penchbird'],
    ],
    cover: 'delhi',
  },
  'demo-west-sichuan': {
    match: [
      [/tagong|塔公草原|塔公午餐/, 'tagong'],
      [/xinduqiao|新都桥/, 'xinduqiao'],
      [/danba-village|丹巴村落/, 'danba'],
      [/康定自由活动/, 'kangding'],
    ],
    nearby: [
      [/danba|丹巴/, 'danba'],
      [/bamei|tagong|八美|塔公/, 'tagong'],
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
