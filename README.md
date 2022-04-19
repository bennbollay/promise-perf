[![CICD](https://github.com/bennbollay/promise-perf/actions/workflows/main_publish_prod.yml/badge.svg)](https://github.com/bennbollay/promise-perf/actions/workflows/main_publish_prod.yml)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

# Promise Performance Monitoring

The Promise Perf library allows you to instrument a Promise chain - any sequence of calls that start with an
`await` or `new Promise` - to get reporting about where time was spent in that chain.

The library is extremely useful when tracing out HTTP calls to determine which operations were the most expensive and
best targets for adding caching or any complicated long-duration operation that is not computationally bound
(where traditional performance analysis tools would shine) but instead, spend a lot of time waiting on external
services.

# Features

Promise Perf was written to satisfy a variety of needs when developing `async` based systems bound more by
network io or remote service performance than computational taskloads.  As such, it supports:

  * Capturing traces from `Promise` hierarchies via `PromisePerf`.
  * Capturing traces from async-based Express handler chains via `ExpressPerf`.
  * Leveraging [source-map](https://npmjs.org/packages/source-map), *if installed*, to translate compiled
  JavaScript with `.js.map` files to their original `.ts` files.
  * Pretty-printing annotated source files when tracing specific requirements.

# How to use it

  Start by installing the `promise_perf` package:

```bash
npm install promise_perf
```

Then, import the package in to the top level `Promise` or `async` function you wish to measure:

```typescript
import { IHookRecords, ExpressPerf, annotateSource, fileToString } from 'promise_perf';
```

Wrap the invocation of an asynchronous function within a `PromisePerf` function, and parse the
resulting records as desired.

```typescript
await PromisePerf.trace(yourAsyncFunction, (rec: IHookRecords) => (records = rec));
```

Or add it as a middleware to your Express router:

```typescript
app.use(
  ExpressPerf.middleware(
    (req: express.Request) => true,
    (req: express.Request, res: express.Response, rec: IHookRecords) => (records = rec)
  )
);
```

All `Promises` created during the invocation of that function will be tracked in the `rec` object, passed to
the supplied callback on completion of the function.  This can then be passed to several utility functions to
provide a pretty annotated output of one or more desired source files:

```javascript
console.log(
  fileToString(
    Object.values(
      await annotateSource(records, { pathFilter: (path) => path.endsWith('basic.js') })
    )[0]
  )
```

# How it works

Promise Perf uses both [async_hook](https://nodejs.org/api/async_hooks.html) as well as
[AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage) to track the
lifespan of individual `Promise` objects within a particular `Promise` chain.

Additionally, [source-map](https://npmjs.org/packages/source-map) is used to optionally support pretty-printing output based on TypeScript `.js.map` files.

As a package, Promise Perf has no required dependencies.

# Examples

## Simple Timeout

Let's start with a simple test in `basic.js` that includes an `setTimeout`, as a proxy for some other piece of work:

```javascript
const testFunc = async () => {
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 10)
  );
};

exports.testFunc = testFunc;
```

We can instrument the invocation of `testFunc` by wrapping it in a `PromisePerf` object:

```typescript
import { IHookRecords, PromisePerf, annotateSource, fileToString } from 'promise_perf';

let records;
await PromisePerf.trace(testFunc, (rec: IHookRecords) => (records = rec));
```

When the function completes and the `testFunc` promise resolves, the supplied callback will be invoked with
the performance records as the parameter.  We can save those to a local variable `records` and then print out the results for just the `basic.js` file:

```javascript
console.log(
  fileToString(
    Object.values(
      await annotateSource(records, { pathFilter: (path) => path.endsWith('basic.js') })
    )[0]
  )
```

This produces the following annotated output, where the number to the left is the duration in `ms`, and the
line of text corresponds to the line of code:

```text
 11 |const testFunc = async () => {
 11 |  await new Promise((resolve) =>
    |    setTimeout(async () => {
    |      resolve(0);
    |    }, 10)
    |  );
    |};
    |
    |exports.testFunc = testFunc;
    |
```

## Express Endpoint

Measuring the output and identifying hot spots or opportunities for caching in an express endpoint was one of the key values around building this - what was most of the time being spent on while servicing a request?

Using a simple express router, let's see what Promise Perf can tell show:

```javascript
const router = express.Router();

const work = async () => {
  await superagent.get('https://www.google.com');
  await superagent.get('https://www.amazon.com');
  await superagent.get('https://www.apple.com');
};

router.get('/', async (req, res) => {
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 100)
  );
  await work();
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 100)
  );
  res.send('All done');
});

exports.router = router;
```

Let's then add the Express middleware to the handling chain.  The first parameter is a function to indicate
whether or not this request should be traced (allowing for easy enabling/disabling based on request
parameters, for example), while the second handles the created records.

```typescript
import { IHookRecords, ExpressPerf, annotateSource, fileToString } from 'promise_perf';

app.use(
  ExpressPerf.middleware(
    (req: express.Request) => true,
    (req: express.Request, res: express.Response, rec: IHookRecords) => (records = rec)
  )
);
app.use(router);
```

Then, using the same code as above, we can output the results of the operation when `records` is set:

```text
     |const express = require('express');
     |const superagent = require('superagent');
     |
     |const router = express.Router();
     |
 646 |const work = async () => {
 157 |  await superagent.get('https://www.google.com');
 156 |  await superagent.get('https://www.amazon.com');
 343 |  await superagent.get('https://www.apple.com');
     |};
     |
     |router.get('/', async (req, res) => {
 202 |  await new Promise((resolve) =>
 101 |    setTimeout(async () => {
     |      resolve(0);
     |    }, 100)
     |  );
 647 |  await work();
 101 |  await new Promise((resolve) =>
 100 |    setTimeout(async () => {
     |      resolve(0);
     |    }, 100)
     |  );
     |  res.send('All done');
     |});
     |
     |exports.router = router;
     |
```

This allows us to easily trace out where the hotspots are, and see what the relative costs of the various
pieces of work involved might be.
