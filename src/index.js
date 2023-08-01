const createXlsx = require("./xlsx");
const { fetchList } = require("./server");
const { xlsxHeader } = require("./options");

const SELL_TYPE = {
  gongshi: 1,
  jishou: 2,
};

const main = async () => {
  try {
    const data1 = await fetchList(SELL_TYPE.gongshi);
    const data2 = await fetchList(SELL_TYPE.jishou);
    let data = [];
    if (data1 && data1.length) {
      data = data.concat(data1);
    }
    if (data2 && data2.length) {
      data = data.concat(data2);
    }
    if (data && data.length) {
      data.unshift(xlsxHeader.map((h) => h.n));
      createXlsx(
        data,
        xlsxHeader.map((h) => h.w)
      );
    } else {
      console.log("没有符合的数据！！！！！！");
    }
  } catch (err) {
    console.log(err);
  }
};

main();
