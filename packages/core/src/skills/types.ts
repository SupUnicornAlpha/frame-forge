import type { AgentContext, AgentDef } from '../agent/types.js';

export interface SkillDocument {
  id: string;
  title: string;
  content: string;
  sourcePath?: string | undefined;
}

export interface SkillsProvider {
  getSkills<TInput = unknown, TOutput = unknown>(
    ctx: AgentContext,
    def: AgentDef<TInput, TOutput>,
    input: TInput
  ): Promise<SkillDocument[]>;
}

