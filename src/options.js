const cookie = "SESSION=NGJkNGMwNzEtNTk1NS00Y2ZlLWFjZGQtYjc5YmFiMTNjYmRi";

const xlsxHeader = [
  { n: "订单状态", w: { wch: 12 } },
  { n: "开始日期", w: { wch: 19 } },
  { n: "结束日期", w: { wch: 19 } },
  { n: "位面编号", w: { wch: 15 } },
  { n: "角色名", w: { wch: 18 } },
  { n: "境界", w: { wch: 50 } },
  { n: "战力", w: { wch: 12 } },
  { n: "至宝", w: { wch: 12 } },
  { n: "氪度", w: { wch: 12 } },
  { n: "价格", w: { wch: 10 } },
  { n: "收藏", w: { wch: 6 } },
  { n: "资源", w: { wch: 80 } },
  { n: "活动", w: { wch: 120 } },
  { n: "主动古宝", w: { wch: 120 } },
  { n: "装备", w: { wch: 120 } },
];

const keduList = [
  { name: "太清玄鉴", value: 10, type: 2 },
  { name: "昭天神树", value: 13, type: 1 },
  { name: "凌天神剑", value: 16, type: 1 },
  { name: "遮天神幡", value: 20, type: 1 },
  { name: "太一仙玺", value: 23, type: 1 },
  { name: "太极灵剑", value: 26, type: 1 },
  { name: "太素玄衫", value: 30, type: 1 },
  { name: "药师光明塔", value: 36, type: 1 },
  { name: "光如来心灯", value: 42, type: 1 },
  { name: "净琉璃梵衣", value: 50, type: 1 },
];

const PAGE_SIZE = 5000;

// 上架列表筛选
// 真仙 / 真武中期 - 真仙 / 真武后期
// 亮点标签 - 造化至宝
const listFilter = {
  startHp: 35,
  endHp: 35,
  startMp: 35,
  endMp: 35,
  zaohua: 1,
};

// 服务器请求间隔时间 - 防止被风控
const requestServerTimeRandomRange = [0.5, 1];

// 角色位面范围过滤查询
const limitServerRange = [3600, 3900];

// 查找背包资源
const findDaoju = [
  "鸿蒙造化玉",
  "雷劫珠",
  "息土",
  "探宝令",
  ["补天玉"],
  "跃迁令",
];

// 查找衣服 - 可以判断月活氪金情况
const findYifu = ["灵画·西子游春", "灵画·天命封神", "灵画·不朽星尊"];

// 查找挂件 - 可以判断是否氪金至宝皮肤
const findGuajian = ["掌天瓶", "万物母气鼎"];

module.exports = {
  cookie,
  keduList,
  xlsxHeader,
  listFilter,
  limitServerRange,
  requestServerTimeRandomRange,
  findDaoju,
  findYifu,
  findGuajian,
  PAGE_SIZE,
};
