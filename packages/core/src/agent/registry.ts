import type { AgentDef, AgentRole } from './types.js';

/**
 * Agent 注册表接口。
 *
 * 参考 OpenClaw AgentRouteBinding 模式：通过注册表解耦 Agent 的定义与使用，
 * 新 Agent 类型只需调用 register() 即可接入，无需修改调度逻辑。
 */
export interface AgentRegistry {
  register(def: AgentDef): void;
  get(role: AgentRole): AgentDef | undefined;
  getAll(): AgentDef[];
  has(role: AgentRole): boolean;
}

/** 默认的内存 AgentRegistry 实现 */
export class InMemoryAgentRegistry implements AgentRegistry {
  private readonly defs = new Map<AgentRole, AgentDef>();

  register(def: AgentDef): void {
    if (this.defs.has(def.role)) {
      throw new Error(`Agent role "${def.role}" is already registered. Use a unique role.`);
    }
    this.defs.set(def.role, def);
  }

  get(role: AgentRole): AgentDef | undefined {
    return this.defs.get(role);
  }

  getAll(): AgentDef[] {
    return Array.from(this.defs.values());
  }

  has(role: AgentRole): boolean {
    return this.defs.has(role);
  }
}
