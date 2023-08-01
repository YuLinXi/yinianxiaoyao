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
      const { huodong, originData: originData4 } = await fetchRole(item.billId);
      resultData = resultData.concat([
        createData(item, { zhibao, kedu, ziyuan, huodong }),
      ]);
      completedCount++;
      console.log(`======= 进度：${completedCount}/${filterData.length}`);
      deailtDataList.push({
        id: item.id,
        gubao: originData1,
        dongfuxinxi: originData2,
        xingnang: originData3,
        juese: originData4,
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
    return {
      huodong: [].concat(yifuList, guajianList).join("；  "),
      originData: info,
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
