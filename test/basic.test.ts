import { IHookRecords, PromisePerf, annotateSource, fileToString } from '../src';

const { testFunc } = require('./mock/basic');

test('Simple promise records', async () => {
  let records: IHookRecords = {};

  // Trace the function and catch the responding records
  await PromisePerf.trace(testFunc, (rec: IHookRecords) => (records = rec));

  console.log(
    fileToString(
      Object.values(await annotateSource(records, { pathFilter: (path) => path.endsWith('mock/basic.js') }))[0]
    )
  );

  // Expected:
  //  44 |const testFunc = async () => {
  //  11 |  await new Promise((resolve) =>
  //     |    setTimeout(async () => {
  //     |      resolve(0);
  //     |    }, 10)
  //     |  );
  //  11 |  await new Promise((resolve) =>
  //     |    setTimeout(async () => {
  //     |      resolve(0);
  //     |    }, 10)
  //     |  );
  //  11 |  await new Promise((resolve) =>
  //     |    setTimeout(async () => {
  //     |      resolve(0);
  //     |    }, 10)
  //     |  );
  //  11 |  await new Promise((resolve) =>
  //     |    setTimeout(async () => {
  //     |      resolve(0);
  //     |    }, 10)
  //     |  );
  //     |};
  //     |
  //     |exports.testFunc = testFunc;
  //     |
});
