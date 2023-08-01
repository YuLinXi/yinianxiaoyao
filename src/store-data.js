const path = require("path");
const nodeFs = require("fs-extra");
const dayjs = require("dayjs");

const BASE_URL = path.resolve(__dirname, "../history-data/");

const storeData = (data, fileName) => {
  const newFileName = dayjs().format("YYYYMMDDHHmmss") + "-" + fileName;
  const json = JSON.stringify(data, "", "\t");
  nodeFs.outputFile(BASE_URL + "/" + newFileName + ".json", json, (err) => {
    if (err) {
      console.log("create history data error：", err);
    } else {
      console.log(`create ${newFileName}.json success! `);
    }
  });
};

module.exports = storeData;
