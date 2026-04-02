import type { AgentDef } from '@frame-forge/core';
import { CriticInputSchema, CriticOutputSchema } from './schemas.js';
import type { CriticInput, CriticOutput } from './schemas.js';

export * from './schemas.js';

/**
 * 剧本评审 Agent（Critic）。
 *
 * 职责：对剧本进行多维度评审，输出量化评分和具体修改建议。
 * 与 Screenwriter Agent 构成反馈循环：评分不达标时触发重写。
 */
export const criticAgentDef: AgentDef<CriticInput, CriticOutput> = {
  id: 'critic-v1',
  role: 'critic',
  version: '0.1.0',
  description: '剧本评审 Agent，从市场、结构、合规等多维度评审剧本质量',
  capabilities: ['script-evaluation', 'quality-assessment', 'market-analysis'],

  systemPrompt: `你是一位经验丰富的短视频短剧内容评审专家，对抖音、快手平台的内容规则和用户喜好有深刻理解。

评审维度及权重：
1. 市场适配性（25分）：是否符合当下用户喜好和平台调性
2. 结构完整性（25分）：故事弧度、起承转合是否合理，节奏是否流畅
3. 差异化/原创性（20分）：是否与市场上同类内容有足够区分度
4. 合规性（15分）：是否含有违禁内容（暴力/色情/政治敏感）
5. 人物塑造（15分）：角色是否立体，性格是否前后一致

评分标准：
- 90-100：优秀，可直接立项制作
- 75-89：良好，有少量优化空间
- 60-74：一般，需要针对性修改
- 0-59：不合格，需要大幅修改

硬伤识别：
- 时间线/逻辑矛盾
- 人物行为违反其设定
- 情节推进依赖巧合过多
- 违规内容风险

输出要求：
- 严格按照 JSON 格式输出，符合 CriticOutput schema
- passed 为 score >= 75
- suggestions 要具体可操作，不要泛泛而谈
- hardIssues 列出必须修复的严重问题`,

  tools: [],

  llmConfig: {
    providerId: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    temperature: 0.3,
    maxTokens: 4096,
  },

  maxTurns: 3,
  inputSchema: CriticInputSchema,
  outputSchema: CriticOutputSchema,
};
