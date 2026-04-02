import { describe, it, expect, vi } from 'vitest';
import { InMemoryEventBus } from '../events/bus.js';

describe('InMemoryEventBus', () => {
  it('emits and receives typed events', () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    bus.on('task.started', handler);
    bus.emit({ type: 'task.started', taskId: 'task-1' });

    expect(handler).toHaveBeenCalledWith({ type: 'task.started', taskId: 'task-1' });
  });

  it('unsubscribes via returned cleanup function', () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    const unsubscribe = bus.on('task.started', handler);
    unsubscribe();
    bus.emit({ type: 'task.started', taskId: 'task-2' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('once() fires only once', () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();

    bus.once('task.completed', handler);
    bus.emit({ type: 'task.completed', taskId: 'task-3', result: {} });
    bus.emit({ type: 'task.completed', taskId: 'task-4', result: {} });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isolates different event types', () => {
    const bus = new InMemoryEventBus();
    const startedHandler = vi.fn();
    const failedHandler = vi.fn();

    bus.on('task.started', startedHandler);
    bus.on('task.failed', failedHandler);

    bus.emit({ type: 'task.started', taskId: 'x' });

    expect(startedHandler).toHaveBeenCalledTimes(1);
    expect(failedHandler).not.toHaveBeenCalled();
  });
});
