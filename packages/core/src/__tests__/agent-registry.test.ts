import { describe, it, expect } from 'vitest';
import { InMemoryAgentRegistry } from '../agent/registry.js';
import type { AgentDef } from '../agent/types.js';

function makeDef(role: string): AgentDef {
  return {
    id: `test-${role}`,
    role,
    systemPrompt: 'You are a test agent.',
    tools: [],
    llmConfig: { providerId: 'test', model: 'test-model' },
  };
}

describe('InMemoryAgentRegistry', () => {
  it('registers and retrieves an agent', () => {
    const registry = new InMemoryAgentRegistry();
    const def = makeDef('screenwriter');
    registry.register(def);
    expect(registry.get('screenwriter')).toBe(def);
  });

  it('throws on duplicate role registration', () => {
    const registry = new InMemoryAgentRegistry();
    registry.register(makeDef('critic'));
    expect(() => registry.register(makeDef('critic'))).toThrow(/already registered/);
  });

  it('returns undefined for unknown role', () => {
    const registry = new InMemoryAgentRegistry();
    expect(registry.get('unknown-role')).toBeUndefined();
  });

  it('lists all registered agents', () => {
    const registry = new InMemoryAgentRegistry();
    registry.register(makeDef('scheduler'));
    registry.register(makeDef('screenwriter'));
    expect(registry.getAll()).toHaveLength(2);
  });

  it('has() returns correct boolean', () => {
    const registry = new InMemoryAgentRegistry();
    registry.register(makeDef('audience'));
    expect(registry.has('audience')).toBe(true);
    expect(registry.has('storyboard')).toBe(false);
  });
});
