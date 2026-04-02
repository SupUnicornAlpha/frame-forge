import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentContext, AgentDef } from '../agent/types.js';
import type { SkillDocument, SkillsProvider } from './types.js';

export interface FileSystemSkillsProviderConfig {
  rootDir: string;
  maxFiles?: number | undefined;
}

/**
 * 基于文件系统的 skills provider。
 *
 * 约定：
 * - 通过 ctx.metadata.skillIds 指定技能名数组
 * - 每个技能位于 rootDir/<skillId>/SKILL.md
 */
export class FileSystemSkillsProvider implements SkillsProvider {
  private readonly rootDir: string;
  private readonly maxFiles: number;

  constructor(config: FileSystemSkillsProviderConfig) {
    this.rootDir = config.rootDir;
    this.maxFiles = config.maxFiles ?? 12;
  }

  async getSkills<TInput = unknown, TOutput = unknown>(
    ctx: AgentContext,
    _def: AgentDef<TInput, TOutput>,
    _input: TInput
  ): Promise<SkillDocument[]> {
    const skillIds = this.readSkillIds(ctx);
    if (skillIds.length === 0) return [];

    const picked = skillIds.slice(0, this.maxFiles);
    const docs: SkillDocument[] = [];

    for (const skillId of picked) {
      const filePath = path.join(this.rootDir, skillId, 'SKILL.md');
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        docs.push({
          id: skillId,
          title: skillId,
          content,
          sourcePath: filePath,
        });
      } catch {
        // 忽略缺失文件，避免阻塞主流程
      }
    }
    return docs;
  }

  private readSkillIds(ctx: AgentContext): string[] {
    const value = ctx.metadata['skillIds'];
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
}

