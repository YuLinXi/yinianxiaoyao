const xlsx = require("node-xlsx");
const dayjs = require("dayjs");
const nodeFs = require("fs-extra");
const path = require("path");

const file = path.resolve(__dirname, "../xlsx/");

const createXlsx = (data, colsOptions) => {
  const fileName = dayjs().format("YYYY-MM-DD HH:mm:ss 雷霆村");
  const buffer = xlsx.build([{ name: "雷霆村", data }], {
    sheetOptions: {
      "!cols": colsOptions,
    },
  });
  nodeFs.outputFile(file + "/" + fileName + ".xlsx", buffer, (err) => {
    if (err) {
      console.log("create xlsx error：", err);
    } else {
      console.log(`create ${fileName}.xlsx success! total ${data.length - 1}`);
    }
  });
};

module.exports = createXlsx;
