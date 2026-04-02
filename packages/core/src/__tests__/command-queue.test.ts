import { describe, it, expect } from 'vitest';
import { InMemoryCommandQueue } from '../queue/command-queue.js';

describe('InMemoryCommandQueue', () => {
  it('executes a task and returns result', async () => {
    const queue = new InMemoryCommandQueue();
    const result = await queue.enqueue('main', () => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('serializes tasks in the same lane', async () => {
    const queue = new InMemoryCommandQueue();
    const order: number[] = [];

    await Promise.all([
      queue.enqueue('pipeline', async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(1);
      }),
      queue.enqueue('pipeline', async () => {
        order.push(2);
      }),
    ]);

    expect(order).toEqual([1, 2]);
  });

  it('allows concurrent tasks in subagent lane', async () => {
    const queue = new InMemoryCommandQueue([{ name: 'subagent', maxConcurrent: 3 }]);
    const started: number[] = [];

    const tasks = [1, 2, 3].map((n) =>
      queue.enqueue('subagent', async () => {
        started.push(n);
        await new Promise((r) => setTimeout(r, 10));
        return n;
      })
    );

    await Promise.all(tasks);
    expect(started).toHaveLength(3);
  });

  it('rejects after drain()', async () => {
    const queue = new InMemoryCommandQueue();
    await queue.drain();
    await expect(queue.enqueue('main', () => Promise.resolve())).rejects.toThrow(/draining/);
  });
});
