const Pool = require('./pool');
const PoolWorker = require('./pool-worker');

const script = `
  const vm = require('vm');
  const { parentPort } = require('worker_threads');
  parentPort.on('message', ({ code, workerData }) => {
    this.workerData = workerData;
    const result = vm.runInThisContext(code);
    parentPort.postMessage(result);
  });
`;

/**
 * Threads pool that can run different function
 * each call.
 */
module.exports = class DynamicPool extends Pool {
  constructor(size) {
    super(size);
    this.fill(() => new PoolWorker(this, script, { eval: true }));
  }

  /**
   * choose a idle worker to execute the function
   * with context provided.
   * @param { Object } opt
   * @param { Function } opt.task function to be executed.
   * @param { * } opt.workerData 
   */
  exec({ task, workerData }) {
    if (typeof task !== 'function') {
      throw new Error('task "fn" must be a function!');
    }
    const code = `(${ task.toString() })()`;
    const param = { code, workerData };
    return this.runTask(param);
  }
}