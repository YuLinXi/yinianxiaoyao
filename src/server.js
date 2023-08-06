const axios = require("axios");
const {
  cookie,
  keduList,
  listFilter,
  limitServerRange,
  requestServerTimeRandomRange,
  findDaoju,
  findYifu,
  findGuajian,
  PAGE_SIZE,
} = require("./options");
const storeData = require("./store-data");

const instance = axios.create({
  baseURL: "https://fortunaapi.leiting.com",
  headers: {
    Gamecode: "xianP",
    Cookie: cookie,
  },
});

const sleep = () =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, Math.floor((Math.random() * (requestServerTimeRandomRange[1] - requestServerTimeRandomRange[0]) + requestServerTimeRandomRange[0]) * 1000));
  });

const createData = (
  item,
  {
    zhibao = `${item.extend.zhibao.length}至宝`,
    kedu = "未知",
    ziyuan = "未知",
    huodong = "无信息",
    zhudonggubao = '无信息',
    zhuangbei = '无信息'
  } = {}
) => {
  const { status, extend } = item;
  return [
    status === 1 ? "公示期" : "寄售期",
    (status === 1 ? item.createDate : item.sellStartDate) || "-",
    (status === 1 ? item.publicEndDate : item.sellEndDate) || "-",
    `${item.serverId}-${item.serverName}`,
    item.name || "-",
    extend.levelDesc || "-",
    `${(Number(extend.combatCapacity) / 100000000 / 10000).toFixed(2)}万亿`,
    zhibao || "-",
    kedu || "-",
    item.price || "-",
    item.collected || "-",
    ziyuan || "-",
    huodong || "-",
    zhudonggubao || "-",
    zhuangbei || "-",
  ];
};

const handleData = async (data, sellType) => {
  // 过滤位面范围
  let filterData = data.filter(
    (item) =>
      Number(item.serverId) > limitServerRange[0] &&
      Number(item.serverId) < limitServerRange[1]
  );

  filterData = filterData.filter((item) => {
    item.extend = JSON.parse(item.extend);

    if (item.extend.zhibao?.length < 6) {
      return false;
    }

    return true;
  });
  // 过滤六至宝以下
  console.log(
    `======= ${sellType === 1 ? "公示期" : "寄售期"}总计：${
      filterData.length
    } 条数据`
  );
  let resultData = [];
  const deailtDataList = [];
  try {
    let completedCount = 0;
    for (const item of filterData) {
      await sleep();
      const { kedu, originData: originData1 } = await fetchGubao(item.billId);
      await sleep();
      const { zhibao, originData: originData2 } = await fetchDongfuxinxi(
        item.billId
      );
      await sleep();
      const { ziyuan, originData: originData3 } = await fetchBaggage(
        item.billId
      );
      await sleep();
      const { huodong, originData: originData4,zhudonggubao,zhuangbei } = await fetchRole(item.billId);
      resultData = resultData.concat([
        createData(item, { zhibao, kedu, ziyuan, huodong ,zhudonggubao,zhuangbei}),
      ]);
      completedCount++;
      console.log(`======= 进度：${completedCount}/${filterData.length}`);
      deailtDataList.push({
        id: item.id,
        gubao: originData1,
        dongfuxinxi: originData2,
        xingnang: originData3,
        juese: originData4,
        zhudonggubao,
        zhuangbei
      });
    }
    storeData(deailtDataList, "detail");
    return resultData;
  } catch (err) {
    // 降级处理，雷霆好像封我IP了
    for (const item of filterData) {
      resultData = resultData.concat([createData(item)]);
    }
    console.log(err.message);
    return resultData;
  }
};

// 查询详情
const fetchDetail = async (id, part) => {
  try {
    const {
      data: { data, message, status },
    } = await instance.post("/api/sellbill/bill_detail", {
      billId: id,
      part,
    });

    if (status === 0) {
      return data;
    }
    throw new Error(message);
  } catch (err) {
    throw err;
  }
};

// 查询洞府信息
const fetchDongfuxinxi = async (id) => {
  try {
    const data = await fetchDetail(id, "house");
    const info = JSON.parse(data);
    if (info.show_list.length) {
      const list = info.show_list[2].list;
      const zhibao = list.map((item) => item.level).join("");
      return {
        zhibao,
        originData: info,
      };
    }
    throw new Error("查询洞府信息数据错误");
  } catch (err) {
    throw err;
  }
};

// 查询古宝
const fetchGubao = async (id) => {
  try {
    const data = await fetchDetail(id, "gubao_only");
    const info = JSON.parse(data);
    if (info.show_list.length) {
      const lingbao = info.show_list[0].list.tab_1[1].contentList;
      const zhibao = info.show_list[0].list.tab_1[0].contentList;
      let kedu = 0;
      for (const item of keduList) {
        let find;
        if (item.type === 2) {
          find = lingbao.find((i) => i.name === item.name);
        } else {
          find = zhibao.find((i) => i.name === item.name);
        }

        if (find) {
          kedu = item.value;
        } else {
          break;
        }
      }

      return {
        kedu: kedu === 0 ? "< 10w" : `${kedu}w + `,
        originData: info,
      };
    }
  } catch (err) {
    console.log(err.message);
    throw err;
  }
};

// 查询背包资源
const fetchBaggage = async (id) => {
  try {
    const data = await fetchDetail(id, "baggage");
    const info = JSON.parse(data);
    const daoju = info.show_list[1].list;
    if (daoju && daoju.length) {
      const resultList = findDaoju.map((name) => {
        if (Array.isArray(name)) {
          const count = daoju.reduce((sum, next) => {
            if (next.name === name[0]) {
              return sum + next.amount;
            }
            return sum;
          }, 0);
          return `${name[0]}:${count}`;
        } else {
          let find = daoju.find((item) => item.name === name);
          return `${name}:${find ? find.amount : 0}`;
        }
      });
      return {
        ziyuan: resultList.join("； "),
        originData: info,
      };
    }
  } catch (err) {
    throw err;
  }
};
// 查询活动资源
const fetchRole = async (id) => {
  try {
    const data = await fetchDetail(id, "character");
    const info = JSON.parse(data);
    // 活动至宝
    const guajian =
      info.show_list[2].list.find((i) => i.title === "挂件")?.contentList || [];
    const guajianList = findGuajian.map((name) => {
      let find = guajian.find((item) => item.name === name);
      if (find) {
        return `${name}:已获取`;
      }
      return `${name}:未获取`;
    });

    // 活动灵画
    const yifu =
      info.show_list[2].list.find((i) => i.title === "衣服")?.contentList || [];
    const yifuList = findYifu.map((name) => {
      let find = yifu.find((item) => item.name === name);
      if (find) {
        return `${name}:已获取`;
      }
      return `${name}:未获取`;
    });
    const zhuangbeilist = info.show_list[6].list
    // [
    //   {
    //     "name":"泰阿剑",
    //     "icon":"Assets/UI/Icons/Item/91078.png",
    //     "quality":"orange",
    //     "level":6,
    //     "grade":8,
    //     "class_id":91129,
    //     "gubao_tags":"others",
    //     "item_type":"gubao",
    //     "rid":"I03B762EDB37B0001"
    // },
    // {
    //     "name":"寒星囚龙戟",
    //     "icon":"Assets/UI/Icons/Item/n91240.png",
    //     "quality":"orange",
    //     "level":6,
    //     "grade":8,
    //     "class_id":91337,
    //     "gubao_tags":"others",
    //     "item_type":"gubao",
    //     "rid":"I03B7632677D00000"
    // },
    // {
    //     "name":"坤元量天尺",
    //     "icon":"Assets/UI/Icons/Item/n91547.png",
    //     "quality":"orange",
    //     "level":4,
    //     "grade":8,
    //     "class_id":91547,
    //     "gubao_tags":"others",
    //     "item_type":"gubao",
    //     "rid":"I03BB23B23DAB0006"
    // },
    // {
    //     "rid":"E03A8A459CEF50000",
    //     "icon":"Assets/UI/Icons/Item/n31501.png",
    //     "name":"昊天宝剑",
    //     "quality":"orange",
    //     "level":159,
    //     "equip_levelup":4,
    //     "equip_type":"weapon",
    //     "class_id":31501,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png"
    //     ]
    // },
    // {
    //     "rid":"E03A8645907140000",
    //     "icon":"Assets/UI/Icons/Item/n31510.png",
    //     "name":"昊天宝链",
    //     "quality":"orange",
    //     "level":139,
    //     "equip_levelup":1,
    //     "equip_type":"fabao",
    //     "class_id":31510,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png"
    //     ]
    // },
    // {
    //     "rid":"E03A8A46EB55E0000",
    //     "icon":"Assets/UI/Icons/Item/n31508.png",
    //     "name":"昊天宝钟",
    //     "quality":"orange",
    //     "level":139,
    //     "equip_levelup":1,
    //     "equip_type":"fabao",
    //     "class_id":31508,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png"
    //     ]
    // },
    // {
    //     "rid":"E03A8A46EB5B60000",
    //     "icon":"Assets/UI/Icons/Item/n31508.png",
    //     "name":"昊天宝钟",
    //     "quality":"orange",
    //     "level":139,
    //     "equip_levelup":1,
    //     "equip_type":"fabao",
    //     "class_id":31508,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png"
    //     ]
    // },
    // {
    //     "rid":"E03A8A474A4200000",
    //     "icon":"Assets/UI/Icons/Item/n31505.png",
    //     "name":"昊天宝环",
    //     "quality":"orange",
    //     "level":159,
    //     "equip_levelup":2,
    //     "equip_type":"accessories",
    //     "class_id":31505,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png"
    //     ]
    // },
    // {
    //     "rid":"E03A924A0C8E00000",
    //     "icon":"Assets/UI/Icons/Item/n31507.png",
    //     "name":"昊天宝印",
    //     "quality":"orange",
    //     "level":139,
    //     "equip_levelup":1,
    //     "equip_type":"fabao",
    //     "class_id":31507,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png"
    //     ]
    // },
    // {
    //     "rid":"E03A924A21A8F0001",
    //     "icon":"Assets/UI/Icons/Item/n31507.png",
    //     "name":"昊天宝印",
    //     "quality":"orange",
    //     "level":139,
    //     "equip_levelup":1,
    //     "equip_type":"fabao",
    //     "class_id":31507,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png"
    //     ]
    // },
    // {
    //     "rid":"E03AA2473F5BA0000",
    //     "icon":"Assets/UI/Icons/Item/n31444.png",
    //     "name":"昊天煞锤",
    //     "quality":"orange",
    //     "level":139,
    //     "equip_levelup":1,
    //     "equip_type":"fabao",
    //     "class_id":31248,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png"
    //     ]
    // },
    // {
    //     "rid":"E03A8A4C274300000",
    //     "icon":"Assets/UI/Icons/Item/n31504.png",
    //     "name":"后土古袍",
    //     "quality":"orange",
    //     "level":139,
    //     "equip_levelup":1,
    //     "equip_type":"cloth",
    //     "class_id":31504,
    //     "item_type":"equipment",
    //     "affix":[
    //         "Assets/UI/WindowAssets/EquipAshram/mark_purple.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png",
    //         "Assets/UI/WindowAssets/EquipAshram/mark_blue.png"
    //     ]
    // }

    // 分析装备  item_type gubao 为主动古宝
    // 分析装备  item_type equipment 为装备
    // 分析装备  装备存在 equip_levelup 为装备精炼等级
    // 分析装备  装备存在 level 为装备共鸣等级
    // 分析装备  主动古宝 level 为古宝星级
    // 分析装备  主动古宝 grade 为古宝等级

    // 根据列表分析装备
    // 统计主动古宝
    const zdgb_list = zhuangbeilist.filter(item => item.item_type === 'gubao')
    const zdgb= zdgb_list.map(item => {
      if (item.level === 6 && item.grade === 8) {
        return `${item.name}:已满星`
      }
      return `${item.name}:未满星`
    })
    // 统计装备精炼等级
    const zb_list = zhuangbeilist.filter(item => item.item_type === 'equipment')
    let jl_arr = []
    let gm_arr = []
    zb_list.forEach(item => {
      if (item.equip_levelup) {
        jl_arr.push(item.equip_levelup)
      }
      if (item.level) {
        gm_arr.push(item.level)
      }
    })
    const jl_str = jl_arr.length ? `装备精炼等级：${jl_arr.join('、')}` : ''
    const gm_str = gm_arr.length ? `装备最低共鸣等级：${Math.min(...gm_arr)}` : ''
    return {
      huodong: [].concat(yifuList, guajianList).join("；  "),
      originData: info,
      zhudonggubao: zdgb.join('；  '),
      zhuangbei: [jl_str, gm_str].filter(item => item).join('；  ')
    };
  } catch (err) {
    throw new Error("查询活动资源错误");
  }
};

// 获取公示账号列表
const fetchList = async (sellType) => {
  try {
    const {
      data: { data, message, status },
    } = await instance.post("/api/sellbill/sell_list", {
      endPrice: "",
      extend: JSON.stringify(listFilter),
      order: 2,
      orderType: 1,
      pageNum: 1,
      pageSize: PAGE_SIZE,
      sellType,
      startPrice: "",
    });

    if (status === 0) {
      // 存储元数据
      storeData(data.list, "list");
      return await handleData(data.list, sellType);
    }
    throw new Error(message);
  } catch (err) {
    throw err;
  }
};

module.exports = {
  fetchList,
};
