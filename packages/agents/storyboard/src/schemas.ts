import { z } from 'zod';

export const StoryboardFrameSchema = z.object({
  sceneId: z.string(),
  frameIndex: z.number(),
  imagePrompt: z.string().describe('图像生成提示词（英文，详细）'),
  negativePrompt: z.string().optional().describe('负面提示词'),
  cameraAngle: z.string().describe('摄影角度：close-up/medium/wide/overhead等'),
  characters: z.array(z.string()).describe('出现的角色'),
  description: z.string().describe('画面描述（中文）'),
  imageUrl: z.string().url().optional().describe('生成后的图像 URL'),
});

export const StoryboardInputSchema = z.object({
  script: z.unknown().describe('剧本（ScreenwriterOutput 格式）'),
  imageStyle: z
    .enum(['realistic', 'anime', 'cinematic', 'illustration'])
    .default('cinematic'),
  framesPerScene: z.number().int().min(1).max(6).default(3),
  characterProfiles: z
    .record(z.string())
    .optional()
    .describe('人物外貌描述档案 { characterName: visualDescription }'),
});

export const StoryboardOutputSchema = z.object({
  frames: z.array(StoryboardFrameSchema),
  characterProfiles: z
    .record(z.string())
    .describe('更新后的人物视觉档案（用于跨场景一致性）'),
  styleGuide: z.string().describe('整体风格指南'),
});

// 注意：inputSchema 内部使用了 z.default()，其 input 类型可能包含 undefined
// 在 strict/exactOptionalPropertyTypes 下需要用 z.input 对齐。
export type StoryboardInput = z.input<typeof StoryboardInputSchema>;
export type StoryboardOutput = z.infer<typeof StoryboardOutputSchema>;
