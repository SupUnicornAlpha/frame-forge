import type { AgentDef } from '@frame-forge/core';
import { ScreenwriterInputSchema, ScreenwriterOutputSchema } from './schemas.js';
import type { ScreenwriterInput, ScreenwriterOutput } from './schemas.js';

export * from './schemas.js';

/**
 * 编剧 Agent。
 *
 * 职责：基于热点趋势报告或用户指定主题，生成结构完整的短剧剧本，
 * 包括人物设定、场景列表和对话，并附带视觉指导供分镜 Agent 使用。
 */
export const screenwriterAgentDef: AgentDef<ScreenwriterInput, ScreenwriterOutput> = {
  id: 'screenwriter-v1',
  role: 'screenwriter',
  version: '0.1.0',
  description: '编剧 Agent，生成符合趋势的短剧剧本',
  capabilities: ['script-writing', 'character-creation', 'dialogue-generation'],

  systemPrompt: (ctx) => {
    const hasFeedback = ctx.metadata['hasFeedback'] === true;
    const basePrompt = `你是一位专业的短视频短剧编剧，擅长创作在抖音、快手等平台广受欢迎的短剧内容。

你的创作风格：
- 开篇即吸睛，前5秒必须有冲突或悬念
- 对话简洁有力，符合当代年轻人说话习惯
- 情感浓度高，每场景有明确的情绪节奏
- 结局要么反转，要么共情，留有回味

输出要求：
- 严格按照 JSON 格式输出，符合 ScreenwriterOutput schema
- scenes 中每个场景必须包含 visualNotes（视觉指导），用于后续分镜生成
- characters 必须包含 visualDescription（英文外貌描述），便于图像生成保持一致性
- 对话要有节奏感，避免平铺直叙`;

    if (hasFeedback) {
      return `${basePrompt}

【重要提示：这是修改版本】
上一版剧本收到了评审反馈，请根据 feedback 字段中的意见进行针对性修改。
重点关注：
1. 解决所有 hardIssues 中提到的硬伤问题
2. 按照 suggestions 的方向优化内容
3. 保留上一版本的优点，不要全部推翻重写`;
    }

    return basePrompt;
  },

  tools: [],

  llmConfig: {
    providerId: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    temperature: 0.85,
    maxTokens: 8192,
  },

  maxTurns: 5,
  inputSchema: ScreenwriterInputSchema,
  outputSchema: ScreenwriterOutputSchema,

  hooks: {
    beforeRun: async (ctx, input) => {
      if (input && typeof input === 'object' && 'feedback' in input && input.feedback) {
        ctx.metadata['hasFeedback'] = true;
      }
    },
  },
};
