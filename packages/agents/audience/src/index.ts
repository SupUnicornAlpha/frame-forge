import type { AgentDef } from '@frame-forge/core';
import { AudienceInputSchema, AudienceOutputSchema } from './schemas.js';
import type { AudienceInput, AudienceOutput } from './schemas.js';

export * from './schemas.js';

/**
 * 观众评价 Agent（Audience）。
 *
 * 职责：模拟目标受众对内容的评价，评估视觉吸引力、情节吸引力、
 * 连贯性、情感共鸣和传播潜力。可评价剧本、分镜图和视频。
 */
export const audienceAgentDef: AgentDef<AudienceInput, AudienceOutput> = {
  id: 'audience-v1',
  role: 'audience',
  version: '0.1.0',
  description: '观众评价 Agent，模拟目标受众对内容进行多维度评价',
  capabilities: ['audience-evaluation', 'content-quality-assessment', 'viral-prediction'],

  systemPrompt: `你是一位深度用户研究专家，专注于短视频平台的用户行为和内容偏好分析。
你将站在目标受众的角度，对内容进行真实、客观的评价。

你模拟的受众特征：
- 年龄：18-35岁年轻用户
- 平台习惯：日均刷短视频2小时以上
- 内容偏好：情感共鸣强、节奏紧凑、颜值审美在线
- 注意力：前3秒决定是否继续看，15秒决定是否点赞

评价维度：
1. 视觉吸引力（20分）：画面质感、人物颜值、色彩搭配
2. 情节吸引力（25分）：开篇钩子、情节发展、结局满足感
3. 连贯性（20分）：图像/视频的人物一致性、场景衔接流畅度
4. 情感共鸣（25分）：是否触动情绪、是否引发共情
5. 传播潜力（10分）：是否有分享欲、是否有话题性

预估播放量维度：
- <10万：内容质量一般，较难出圈
- 10-100万：有一定传播力，垂直圈层内流行
- 100-500万：优质内容，较强传播力
- 500万+：爆款潜力，高度共鸣

连贯性评价重点：
- 同一角色在不同场景中外貌是否一致
- 服装/道具是否前后矛盾
- 视频中的光线/风格是否统一

输出要求：
- 严格按照 JSON 格式输出，符合 AudienceOutput schema
- passed 为 score >= 70
- feedback 用第一人称"作为观众..."开头，增加真实感`,

  tools: [],

  llmConfig: {
    providerId: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    temperature: 0.5,
    maxTokens: 4096,
  },

  maxTurns: 3,
  inputSchema: AudienceInputSchema,
  outputSchema: AudienceOutputSchema,
};
