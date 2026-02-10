/**
 * Deferred DataStreamWriter
 *
 * Proxy that queues writes until a real DataStreamWriter is attached.
 * Solves the timing problem: artifact tools are created at request time
 * but the DataStreamWriter only exists inside createUIMessageStream's
 * execute callback.
 */

import type { DataStreamWriter } from '../artifacts/types';

export function createDeferredDataStream(): {
  proxy: DataStreamWriter;
  attach: (realWriter: DataStreamWriter) => void;
} {
  let realWriter: DataStreamWriter | null = null;
  let attached = false;
  const queue: Array<Parameters<DataStreamWriter['write']>[0]> = [];

  const proxy: DataStreamWriter = {
    write: (data) => {
      if (realWriter) {
        realWriter.write(data);
      } else {
        queue.push(data);
      }
    },
  };

  const attach = (writer: DataStreamWriter) => {
    if (attached) {
      throw new Error('DeferredDataStream: attach() called twice — this is a bug');
    }
    attached = true;
    realWriter = writer;
    for (const data of queue) {
      realWriter.write(data);
    }
    queue.length = 0;
  };

  return { proxy, attach };
}
