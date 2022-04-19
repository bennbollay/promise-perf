import { createHook, executionAsyncId } from 'async_hooks';

import { getStack } from './GetStack';

export interface IHookRecord {
  asyncId: number;
  triggerAsyncId: number;
  executionAsyncId: number;

  stack?: NodeJS.CallSite[];
  children: number[];

  entered?: bigint;
  duration: bigint;

  name: string;
  type: string;
}

export type IHookRecords = { [id: number | string]: IHookRecord };

export class PerfAsyncHooks {
  hooks?: { disable: () => void };
  records: IHookRecords = {};
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;

  constructor(isEnabled: () => boolean, setEnabled: (enabled: boolean) => void) {
    this.isEnabled = isEnabled;
    this.setEnabled = setEnabled;
  }

  start() {
    if (!this.hooks) {
      this.hooks = createHook(this).enable();
    }
  }

  halt() {
    if (this.hooks) {
      this.hooks.disable();
    }
  }

  results() {
    return this.records;
  }

  enabled(): boolean {
    return this.isEnabled();
  }

  enable() {
    this.setEnabled(true);
  }

  disable() {
    this.setEnabled(false);
  }

  ensureRecord(asyncId: number, triggerAsyncId: number): IHookRecord {
    let record: IHookRecord = this.records[asyncId];
    if (record) {
      return record;
    }

    record = this.records[asyncId] = {
      asyncId,
      triggerAsyncId,
      executionAsyncId: executionAsyncId(),

      children: [],

      duration: 0n,

      name: '',
      type: '',
    };

    this.ensureRecord(triggerAsyncId, triggerAsyncId).children.push(asyncId);

    // Make sure JSON dumping works cleanly with both BigInt's and CallSite objects.
    Object.setPrototypeOf(record, {
      toJSON: () => ({
        ...record,
        entered: record.entered?.toString(),
        duration: record.duration.toString(),
        stack: Object.values(record.stack || {}).map((stack) => ({
          functionName: stack.getFunctionName(),
          fileName: stack.getFileName(),
          ln: stack.getLineNumber(),
          col: stack.getColumnNumber(),
          isNative: stack.isNative(),
        })),
      }),
    });

    return record;
  }

  init = (asyncId: number, type: string, triggerAsyncId: number, resource: object): void => {
    if (!this.enabled()) {
      return;
    }

    const record = this.ensureRecord(asyncId, triggerAsyncId);

    record.entered = process.hrtime.bigint();
    record.type = type;

    // Acquire the stack, without capturing any events...
    this.disable();

    // Get the stack for only files of interest
    record.stack = getStack(0);

    this.enable();
  };

  hookEvent(setEntered: boolean, asyncId: number): void {
    if (!this.enabled()) {
      return;
    }

    // No trigger async id present on non-init events.
    const record: IHookRecord = this.ensureRecord(asyncId, 0);

    if (setEntered && record.entered == undefined) {
      record.entered = process.hrtime.bigint();
    }

    if (!setEntered && record.entered != undefined) {
      record.duration += process.hrtime.bigint() - record.entered;
      record.entered = undefined;
    }
  }

  before = (asyncId: number) => {
    this.hookEvent(true, asyncId);
  };

  after = (asyncId: number) => {
    this.hookEvent(false, asyncId);
  };

  promiseResolve = (asyncId: number) => {
    this.hookEvent(false, asyncId);
  };

  destroy = (asyncId: number) => {
    this.hookEvent(false, asyncId);
  };
}
