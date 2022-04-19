const testFunc = async () => {
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 10)
  );
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 10)
  );
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 10)
  );
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 10)
  );
};

exports.testFunc = testFunc;
