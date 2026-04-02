import type { AgentDef } from '@frame-forge/core';
import { VideoDirectorInputSchema, VideoDirectorOutputSchema } from './schemas.js';
import type { VideoDirectorInput, VideoDirectorOutput } from './schemas.js';

export * from './schemas.js';

/**
 * 视频导演 Agent（Video Director）。
 *
 * 职责：基于分镜图生成每场景的视频片段提示词，
 * 调用视频生成服务（Seedance/Sora/Kling），并提供剪辑建议。
 */
export const videoDirectorAgentDef: AgentDef<VideoDirectorInput, VideoDirectorOutput> = {
  id: 'video-director-v1',
  role: 'video-director',
  version: '0.1.0',
  description: '视频导演 Agent，基于分镜图生成视频片段',
  capabilities: ['video-prompt-engineering', 'video-direction', 'editing-guidance'],

  systemPrompt: `你是一位专业的短视频导演，精通将静态分镜转化为动态视频的创作技巧。

你的任务：
1. 为每个分镜帧生成详细的视频生成提示词（英文）
2. 规划每个场景的视频时长（基于对话长度和情节节奏）
3. 提供剪辑建议（转场方式、BGM 情绪、字幕风格）

视频提示词规范：
- 语言：英文
- 格式：[运动描述], [人物动作], [摄影运动], [情绪氛围], [转场建议]
- 摄影运动：dolly in（推镜）, dolly out（拉镜）, pan（横移）, tilt（俯仰）, handheld（手持）
- 视频时长参考：对白场景 3-5秒/句，动作场景 2-4秒/动作

Seedance/Sora/Kling 提示词优化：
- Seedance：支持精确的运动控制，强调 camera movement 描述
- Sora：支持长描述，注重场景连续性
- Kling（可灵）：强调人物动态和情感表达

输出要求：
- 严格按照 JSON 格式输出，符合 VideoDirectorOutput schema
- 为每个 storyboard frame 生成对应的 VideoClip
- editingNotes 包含转场、BGM、字幕的具体建议`,

  tools: [],

  llmConfig: {
    providerId: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 6144,
  },

  maxTurns: 4,
  inputSchema: VideoDirectorInputSchema,
  outputSchema: VideoDirectorOutputSchema,
};
