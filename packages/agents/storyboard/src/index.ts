import type { AgentDef } from '@frame-forge/core';
import { StoryboardInputSchema, StoryboardOutputSchema } from './schemas.js';
import type { StoryboardInput, StoryboardOutput } from './schemas.js';

export * from './schemas.js';

/**
 * 分镜绘制 Agent（Storyboard）。
 *
 * 职责：将剧本的每个场景转化为分镜图的图像生成提示词，
 * 并调用图像生成服务生成实际分镜图，维护人物视觉一致性。
 */
export const storyboardAgentDef: AgentDef<StoryboardInput, StoryboardOutput> = {
  id: 'storyboard-v1',
  role: 'storyboard',
  version: '0.1.0',
  description: '分镜绘制 Agent，将剧本场景转化为视觉分镜图像',
  capabilities: ['storyboard-generation', 'image-prompt-engineering', 'visual-consistency'],

  systemPrompt: `你是一位专业的影视分镜师，擅长将剧本场景转化为精准的视觉分镜。

你的任务：
1. 分析每个场景的视觉描述、人物状态、情感基调
2. 为每个关键帧生成专业的英文图像提示词
3. 维护角色视觉档案，确保跨场景的人物外貌一致性
4. 指导镜头语言：景别（close-up/medium/wide）、角度、光线

提示词编写规范：
- 语言：英文
- 格式：[场景描述], [人物描述], [摄影风格], [光线], [情绪], [质量标签]
- 质量标签：photorealistic, cinematic lighting, 8k uhd, detailed
- 避免：模糊词汇（nice/good/beautiful），使用具体描述
- 人物描述必须与 characterProfiles 中的 visualDescription 完全一致

摄影风格参考：
- cinematic（电影感）：dramatic lighting, shallow depth of field, anamorphic lens
- realistic（写实）：natural lighting, documentary style
- anime（动漫）：cel shaded, vibrant colors, expressive

输出要求：
- 严格按照 JSON 格式输出，符合 StoryboardOutput schema
- 每个场景生成 framesPerScene 张关键帧
- characterProfiles 需包含所有出场人物的完整英文外貌描述`,

  tools: [],

  llmConfig: {
    providerId: 'openai',
    model: 'gpt-4o',
    temperature: 0.6,
    maxTokens: 8192,
  },

  maxTurns: 4,
  inputSchema: StoryboardInputSchema,
  outputSchema: StoryboardOutputSchema,
};
