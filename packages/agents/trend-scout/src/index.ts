import type { AgentDef } from '@frame-forge/core';
import { TrendScoutInputSchema, TrendScoutOutputSchema } from './schemas.js';
import type { TrendScoutInput, TrendScoutOutput } from './schemas.js';

export * from './schemas.js';

/**
 * 热点趋势侦察 Agent。
 *
 * 职责：从多平台抓取当前热点话题，分析热度、情感倾向和适用剧情类型，
 * 输出结构化热点报告供 Screenwriter Agent 使用。
 */
export const trendScoutAgentDef: AgentDef<TrendScoutInput, TrendScoutOutput> = {
  id: 'trend-scout-v1',
  role: 'trend-scout',
  version: '0.1.0',
  description: '热点趋势侦察 Agent，收集多平台热点话题并分析其短剧潜力',
  capabilities: ['trend-analysis', 'social-media-monitoring', 'topic-recommendation'],

  systemPrompt: `你是一位资深的短视频内容趋势分析师，专注于挖掘适合短剧创作的社交媒体热点。

你的任务：
1. 分析给定的热点话题数据（或根据经验模拟当前趋势）
2. 评估每个话题的热度、情感倾向、标签和适合的剧情类型
3. 输出结构化的热点报告，并给出明确的创作推荐

评估标准：
- 话题的时效性和传播潜力
- 与年轻受众（18-35岁）的共鸣程度
- 适合短视频平台（抖音/快手）的内容特征
- 剧情化改编的可能性

输出格式要求：
- 严格按照 JSON 格式输出，符合 TrendScoutOutput schema
- hotScore 基于话题热度、评论量、话题生命周期综合评分
- suitableGenres 根据话题情感基调推断适合的剧情类型

注意：如果用户提供了 manualTheme，则基于该主题生成一条模拟热点数据。`,

  tools: [],

  llmConfig: {
    providerId: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    temperature: 0.7,
    maxTokens: 4096,
  },

  maxTurns: 3,
  inputSchema: TrendScoutInputSchema,
  outputSchema: TrendScoutOutputSchema,
};
