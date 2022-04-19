import { IHookRecords, ExpressPerf, annotateSource, fileToString } from '../src';

import superagent from 'superagent';

import express from 'express';

const { router } = require('./mock/router');

test('Track a single request', async () => {
  const app = express();
  let listener: any = {};

  // Listen to an endpoint
  const port = await new Promise((resolve) => {
    listener = app.listen(0, () => {
      resolve(listener.address().port);
    });
  });

  let records: IHookRecords = {};

  app.use(
    ExpressPerf.middleware(
      (req: express.Request) => true,
      (req: express.Request, res: express.Response, rec: IHookRecords) => (records = rec)
    )
  );
  app.use(router);

  await superagent.get(`http://localhost:${port}`);

  console.log(
    fileToString(
      Object.values(
        await annotateSource(records, {
          pathFilter: (path) => {
            return path.endsWith('mock/router.js');
          },
        })
      )[0]
    )
  );

  // Expected
  //     |const express = require('express');
  //     |const superagent = require('superagent');
  //     |
  //     |const router = express.Router();
  //     |
  // 646 |const work = async () => {
  // 157 |  await superagent.get('https://www.google.com');
  //     |
  // 156 |  await superagent.get('https://www.amazon.com');
  //     |
  // 343 |  await superagent.get('https://www.apple.com');
  //     |};
  //     |
  //     |router.get('/', async (req, res) => {
  // 202 |  await new Promise((resolve) =>
  // 101 |    setTimeout(async () => {
  //     |      resolve(0);
  //     |    }, 100)
  //     |  );
  // 647 |  await work();
  // 101 |  await new Promise((resolve) =>
  // 100 |    setTimeout(async () => {
  //     |      resolve(0);
  //     |    }, 100)
  //     |  );
  //     |  res.send('All done');
  //     |});
  //     |
  //     |exports.router = router;
  //

  await new Promise((resolve) => listener.close(resolve));
});
