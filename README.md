# node-worker-threads-pool-ts

[node-worker-threads-pool-ts](https://www.npmjs.com/package/node-worker-threads-pool-ts) is a fork of [node-worker-threads-pool](https://www.npmjs.com/package/node-worker-threads-pool) writen in Typescript, and support Typescript task for worker.
Obviously optional [typescript](https://www.npmjs.com/package/typescript) and [ts-node](https://www.npmjs.com/package/ts-node) must be install to enable Typescript support.

[![Actions Status](https://github.com/UrielCh/node-worker-threads-pool-ts/workflows/coveralls-on-push/badge.svg)](https://github.com/UrielCh/node-worker-threads-pool-ts/actions)
[![Coverage Status](https://coveralls.io/repos/github/UrielCh/node-worker-threads-pool-ts/badge.svg?branch=master)](https://coveralls.io/github/UrielCh/node-worker-threads-pool-ts?branch=master)
[![Package Version](https://img.shields.io/npm/v/node-worker-threads-pool-ts.svg)](https://www.npmjs.com/package/node-worker-threads-pool-ts)
![dependences](https://img.shields.io/badge/dependencies-none-brightgreen.svg)
![downloads](https://img.shields.io/npm/dt/node-worker-threads-pool-ts.svg)
![license](https://img.shields.io/npm/l/node-worker-threads-pool-ts.svg)

Simple worker threads pool using Node's worker_threads module. Compatible with ES6+ Promise, Async/Await and TypeScript🚀.

## With this library, you can

- Use `StaticPool` to create a threads pool with a task from worker file or from task function provided to make use of multi-core processor.
- Use `DynamicPool` to create a threads pool with different tasks provided each call. Thus you can get more flexibility than `StaticPool` and make use of multi-core processor.
- Gain extra **controllability** for the underlying threads by the power of worker_threads, like resourceLimits, SHARE_ENV, transferList and more.

## Notification

1. This module can only run in Node.js.

## Installation

```bash
npm install node-worker-threads-pool --save
```

## Simple Example

Quickly create a pool with static task:

```typescript
import { StaticPool } from "node-worker-threads-pool-ts";

const staticPool = new StaticPool({
  size: 4,
  task: (n) => n + 1,
});

staticPool.exec(1).then((result) => {
  console.log("result from thread pool:", result); // result will be 2.
});
```

There you go! 🎉

Create a pool with dynamic task:

```js
import { DynamicPool } from "node-worker-threads-pool-ts";

const dynamicPool = new DynamicPool(4);

dynamicPool
  .exec({
    task: (n) => n + 1,
    param: 1,
  })
  .then((result) => {
    console.log(result); // result will be 2.
  });

dynamicPool
  .exec({
    task: (n) => n + 2,
    param: 1,
  })
  .then((result) => {
    console.log(result); // result will be 3.
  });
```

About the **differences** between StaticPool and DynamicPool, please see [this issue](https://github.com/SUCHMOKUO/node-worker-threads-pool/issues/3).

## API

## `Class: StaticPool`

Instance of StaticPool is a threads pool with static task provided.

### `new StaticPool(opt)`

- `opt` `<Object>`
  - `size` `<number>` Number of workers in this pool.
  - `task` `<string | function>` Static task to do. It can be a absolute path of worker file ([usage here](#example-with-worker-file)) or a function. **⚠️Notice: If task is a function, you can not use closure in it! If you do want to use external data in the function, use workerData to pass some [cloneable data].**
  - `workerData` `<any>` [Cloneable data][cloneable data] you want to access in task function. ([usage here](#access-workerdata-in-task-function))
  - `shareEnv` `<boolean>` Set `true` to enable [SHARE_ENV] for all threads in pool.
  - `resourceLimits` `<Object>` Set [resourceLimits] for all threads in pool.

### Example with worker file

### In the worker.ts

```typescript
// Access the workerData by requiring it.
import { parentPort, workerData } from "worker_threads";

// Something you shouldn"t run in main thread
// since it will block.
function fib(n) {
  if (n < 2) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

// Main thread will pass the data you need
// through this event listener.
parentPort.on("message", (param) => {
  if (typeof param !== "number") {
    throw new Error("param must be a number.");
  }
  const result = fib(param);

  // Access the workerData.
  console.log("workerData is", workerData);

  // return the result to main thread.
  parentPort.postMessage(result);
});
```

### In the main.ts

```typescript
import { StaticPool } from "node-worker-threads-pool";

const filePath = "absolute/path/to/your/worker/script";

const pool = new StaticPool({
  size: 4,
  task: filePath,
  workerData: "workerData!",
});

for (let i = 0; i < 20; i++) {
  (async () => {
    const num = 40 + Math.trunc(10 * Math.random());

    // This will choose one idle worker in the pool
    // to execute your heavy task without blocking
    // the main thread!
    const res = await pool.exec(num);

    console.log(`Fibonacci(${num}) result:`, res);
  })();
}
```

### Access workerData in task function

You can access workerData in task function using `this` keyword:

```typescript
const pool = new StaticPool({
  size: 4,
  workerData: "workerData!",
  task() {
    console.log(this.workerData);
  },
});
```

**⚠️Remember not to use arrow function as a task function when you use `this.workerData`, because arrow function don't have `this` binding.**

### `staticPool.exec(param[, timeout])`

- `param` `<any>` The param your worker script or task function need.
- `timeout` `<number>` Timeout in milisecond for limiting the execution time. When timeout, the function will throw a `TimeoutError`, use `isTimeoutError` function to detect it.
- Returns: `<Promise>`

The simplest way to execute a task without considering other configurations. This will choose an idle worker in the pool to execute your heavy task with the param you provided. The Promise is resolved with the result.

### `staticPool.createExecutor()`

- Returns: `<StaticTaskExecutor>`

Create a task executor of this pool. This is used to apply some advanced settings to a task. See more details of [StaticTaskExecutor](#class-statictaskexecutor).

### `staticPool.destroy()`

Call `worker.terminate()` for every worker in the pool and release them.

## `Class: StaticTaskExecutor`

Executor for StaticPool. Used to apply some advanced settings to a task.

### Example

```typescript
const staticPool = new StaticPool({
  size: 4,
  task: (buf) => {
    // do something with buf.
  },
});

const buf = Buffer.alloc(1024 * 1024);

staticPool
  .createExecutor() // create a StaticTaskExecutor instance.
  .setTimeout(1000) // set timeout for task.
  .setTransferList([buf.buffer]) // set transferList.
  .exec(buf) // execute!
  .then(() => console.log("done!"));
```

### `staticTaskExecutor.setTimeout(t)`

- `t` `<number>` timeout in millisecond.
- Returns: `<StaticTaskExecutor>`

Set timeout for this task.

### `staticTaskExecutor.setTransferList(transferList)`

- `transferList` `<Object[]>`
- Returns: `<StaticTaskExecutor>`

Set [transferList] for this task. This is useful when you want to pass some huge data into worker thread.

### `staticTaskExecutor.exec(param)`

- `param` `<any>`
- Returns: `<Promise>`

Execute this task with the parameter and settings provided. The Promise is resolved with the result your task returned.

## `Class: DynamicPool`

Instance of DynamicPool is a threads pool executes different task functions provided every call.

### `new DynamicPool(size[, opt])`

- `size` `<number>` Number of workers in this pool.
- `opt`
  - `shareEnv` `<boolean>` Set `true` to enable [SHARE_ENV] for every threads in pool.
  - `resourceLimits` `<Object>` Set [resourceLimits] for all threads in pool.

### `dynamicPool.exec(opt)`

- `opt`
  - `task` `<function>` Function as a task to do. **⚠️Notice: You can not use closure in task function!**
  - ~~`workerData` `<any>` [cloneable data] you want to access in task function.~~ (deprecated since 1.4.0, use `param` instead)
  - `param` `<any>` [cloneable data] you want to pass into task function as parameter.
  - `timeout` `<number>` Timeout in milisecond for limiting the execution time. When timeout, the function will throw a `TimeoutError`, use `isTimeoutError` function to detect it.
- Returns: `<Promise>`

Choose one idle worker in the pool to execute your task function. The Promise is resolved with the result your task returned.

### `dynamicPool.createExecutor(task)`

- `task` `Function` task function.
- Returns: `<DynamicTaskExecutor>`

Create a task executor of this pool. This is used to apply some advanced settings to a task. See more details of [DynamicTaskExecutor](#class-dynamictaskexecutor).

### `dynamicPool.destroy()`

Call `worker.terminate()` for every worker in the pool and release them.

## `Class: DynamicTaskExecutor`

Executor for DynamicPool. Used to apply some advanced settings to a task.

### Example

```typescript
const dynamicPool = new DynamicPool(4);

const buf = Buffer.alloc(1024 * 1024);

dynamicPool
  .createExecutor((buf) => {
    // do something with buf.
  })
  .setTimeout(1000) // set timeout for task.
  .setTransferList([buf.buffer]) // set transferList.
  .exec(buf) // execute!
  .then(() => console.log("done!"));
```

### `dynamicTaskExecutor.setTimeout(t)`

- `t` `<number>` timeout in millisecond.
- Returns: `<DynamicTaskExecutor>`

Set timeout for this task.

### `dynamicTaskExecutor.setTransferList(transferList)`

- `transferList` `<Object[]>`
- Returns: `<DynamicTaskExecutor>`

Set [transferList] for this task. This is useful when you want to pass some huge data into worker thread.

### `dynamicTaskExecutor.exec(param)`

- `param` `<any>`
- Returns: `<Promise>`

Execute this task with the parameter and settings provided. The Promise is resolved with the result your task returned.

## `function: isTimeoutError`

Detect if a thrown error is `TimeoutError`.

## `isTimeoutError(err)`

- `err <Error>` The error you want to detect.
- Returns `<boolean>` `true` if the error is a `TimeoutError`.

## Example

```typescript
import { isTimeoutError } from "node-worker-threads-pool";

// create pool.
...

// static pool exec with timeout.
const timeout = 1000;
try {
  const res = await staticPool.exec(param, timeout);
} catch (err) {
  if (isTimeoutError(err)) {
    // deal with timeout.
  } else {
    // deal with other errors.
  }
}

// dynamic pool exec with timeout.
const timeout = 1000;
try {
  const res = await dynamicPool.exec({
    task() {
      // your task.
    },
    timeout
  });
} catch (err) {
  if (isTimeoutError(err)) {
    // deal with timeout.
  } else {
    // deal with other errors.
  }
}
```

## Integration with Webpack

If you are using webpack in your project and want to import third-party libraries in task function, please use `this.require`:

```typescript
const staticPool = new StaticPool({
  size: 4,
  task() {
    const lib = this.require("lib");
    // ...
  },
});
```

```typescript
const dynamicPool = new DynamicPool(4);

dynamicPool
  .exec({
    task() {
      const lib = this.require("lib");
      // ...
    },
  })
  .then((result) => {
    // ...
  });
```

[cloneable data]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[resourcelimits]: https://nodejs.org/api/worker_threads.html#worker_threads_worker_resourcelimits
[share_env]: https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_worker_share_env
[transferlist]: https://nodejs.org/dist/latest-v14.x/docs/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist
[arrow function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
