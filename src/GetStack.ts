export const getStack = (trimExtra: number): undefined | NodeJS.CallSite[] => {
  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack;
  Error.prepareStackTrace = oldPrepareStackTrace;

  if (stack !== null && typeof stack === 'object') {
    return (stack as Array<NodeJS.CallSite>).slice(2 + trimExtra); // Trim getStack and caller.
  }
  return undefined;
};
