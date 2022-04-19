import { IHookRecords, PromisePerf, annotateSource, fileToString } from '../src';

const { testFunc } = require('./mock/promiseall');

test('Simple promise records', async () => {
  let records: IHookRecords = {};

  // Trace the function and catch the responding records
  await PromisePerf.trace(testFunc, (rec: IHookRecords) => (records = rec));

  console.log(
    fileToString(
      Object.values(await annotateSource(records, { pathFilter: (path) => path.endsWith('mock/promiseall.js') }))[0]
    )
  );

  // Expected:
  //  11 |const promiseAll = async () => {
  //  71 |  await Promise.all(
  //     |    [0, 1, 2, 3, 4].map(
  //  55 |      async (n) =>
  // 110 |        await new Promise((resolve) =>
  //  55 |          setTimeout(async () => {
  //     |            resolve(n);
  //     |          }, 10)
  //     |        )
  //     |    )
  //     |  );
  //     |};
  //     |
  //  11 |const testFunc = async () => {
  //  10 |  await promiseAll();
  //     |};
  //     |
  //     |exports.testFunc = testFunc;
  //     |
  //
  // Note: this looks odd because a variety of the Promise objects get rapidly closed or delegated back to
  // parents in a way that obscures their true costs.
});
