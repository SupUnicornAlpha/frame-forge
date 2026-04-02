import type { ExtractEvent, FrameForgeEvent } from './types.js';

export interface EventBus {
  emit<E extends FrameForgeEvent>(event: E): void;
  on<T extends FrameForgeEvent['type']>(
    type: T,
    handler: (event: ExtractEvent<T>) => void
  ): () => void;
  once<T extends FrameForgeEvent['type']>(
    type: T,
    handler: (event: ExtractEvent<T>) => void
  ): void;
  off<T extends FrameForgeEvent['type']>(
    type: T,
    handler: (event: ExtractEvent<T>) => void
  ): void;
}

type AnyHandler = (event: FrameForgeEvent) => void;

/** 进程内 EventBus 实现（v1）。可演进为 Redis Pub/Sub 实现相同接口。 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<AnyHandler>>();

  emit<E extends FrameForgeEvent>(event: E): void {
    const set = this.handlers.get(event.type);
    if (set) {
      for (const handler of set) {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventBus] Handler error for event "${event.type}":`, err);
        }
      }
    }
  }

  on<T extends FrameForgeEvent['type']>(
    type: T,
    handler: (event: ExtractEvent<T>) => void
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const set = this.handlers.get(type)!;
    set.add(handler as AnyHandler);

    return () => this.off(type, handler);
  }

  once<T extends FrameForgeEvent['type']>(
    type: T,
    handler: (event: ExtractEvent<T>) => void
  ): void {
    const wrapper = (event: ExtractEvent<T>) => {
      handler(event);
      this.off(type, wrapper);
    };
    this.on(type, wrapper);
  }

  off<T extends FrameForgeEvent['type']>(
    type: T,
    handler: (event: ExtractEvent<T>) => void
  ): void {
    this.handlers.get(type)?.delete(handler as AnyHandler);
  }
}
