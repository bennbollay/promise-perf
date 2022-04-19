import { IHookRecords, PerfAsyncHooks } from './PerfAsyncHooks';
import { AsyncLocalStorage } from 'async_hooks';

import express from 'express';

interface IAsyncStorage {
  enabled: boolean;
}

export class ExpressPerf {
  public static middleware(
    onRequest: (req: express.Request) => boolean,
    onResults: (req: express.Request, res: express.Response, records: IHookRecords) => void
  ): (req: express.Request, res: express.Response, next: express.NextFunction) => void {
    const storage = new AsyncLocalStorage();
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!onRequest(req)) {
        // Not enabled for this request
        return next();
      }

      storage.enterWith({ enabled: true });

      const hooks = new PerfAsyncHooks(
        () => (storage.getStore() as IAsyncStorage)?.enabled,
        (enabled: boolean) => ((storage.getStore() as IAsyncStorage).enabled = enabled)
      );

      hooks.start();

      const end = res.end;
      res.end = (chunk: any, encoding?: any, callback?: any) => {
        // Turn off the
        hooks.halt();
        storage.disable();
        onResults(req, res, hooks.results());

        res.end = end;
        return res.end(chunk, encoding, callback);
      };
      return next();
    };
  }
}
