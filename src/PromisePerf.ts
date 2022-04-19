import { AsyncLocalStorage } from 'async_hooks';
import { IHookRecords, PerfAsyncHooks } from './PerfAsyncHooks';

export type AsyncFunction = <T>() => Promise<T | void>;

interface IAsyncStorage {
  enabled: boolean;
}

export class PromisePerf {
  public static async trace<T>(target: AsyncFunction, onResults: (records: IHookRecords) => void): Promise<T | void> {
    const storage = new AsyncLocalStorage();
    storage.enterWith({ enabled: true });

    const hooks = new PerfAsyncHooks(
      () => (storage.getStore() as IAsyncStorage)?.enabled,
      (enabled: boolean) => ((storage.getStore() as IAsyncStorage).enabled = enabled)
    );

    try {
      hooks.start();
      return await target();
    } finally {
      hooks.halt();
      storage.disable();
      onResults(hooks.results());
    }
  }
}
