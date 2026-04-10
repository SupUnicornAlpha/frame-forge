import { z } from 'zod';

export const VideoDirectorInputSchema = z.object({
  storyboard: z.unknown().describe('分镜输出（StoryboardOutput 格式）'),
  script: z.unknown().describe('剧本（ScreenwriterOutput 格式）'),
  videoStyle: z
    .enum(['cinematic', 'documentary', 'vlog', 'animation'])
    .default('cinematic'),
  targetResolution: z.enum(['480p', '720p', '1080p']).default('720p'),
  targetFps: z.number().int().default(24),
});

export const VideoClipSchema = z.object({
  sceneId: z.string(),
  referenceImageUrl: z.string().url().describe('分镜图 URL'),
  videoPrompt: z.string().describe('视频生成提示词'),
  duration: z.number().describe('片段时长（秒）'),
  videoUrl: z.string().url().optional().describe('生成后的视频 URL'),
  generationTaskId: z.string().optional().describe('异步生成任务 ID'),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
});

export const VideoDirectorOutputSchema = z.object({
  clips: z.array(VideoClipSchema),
  finalVideoUrl: z.string().url().optional().describe('拼接后的完整视频 URL'),
  totalDuration: z.number().describe('总时长（秒）'),
  editingNotes: z.string().describe('剪辑建议'),
});

// 注意：inputSchema 内部使用了 z.default()，其 input 类型可能包含 undefined
// 在 strict/exactOptionalPropertyTypes 下需要用 z.input 对齐。
export type VideoDirectorInput = z.input<typeof VideoDirectorInputSchema>;
export type VideoDirectorOutput = z.infer<typeof VideoDirectorOutputSchema>;
