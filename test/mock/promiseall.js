const promiseAll = async () => {
  await Promise.all(
    [0, 1, 2, 3, 4].map(
      async (n) =>
        await new Promise((resolve) =>
          setTimeout(async () => {
            resolve(n);
          }, 10)
        )
    )
  );
};

const testFunc = async () => {
  await promiseAll();
};

exports.testFunc = testFunc;
