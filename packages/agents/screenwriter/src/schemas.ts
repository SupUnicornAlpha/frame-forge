import { z } from 'zod';

export const CharacterSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  personality: z.string().describe('性格描述'),
  background: z.string().describe('背景故事'),
  visualDescription: z.string().describe('外貌描述（用于分镜图生成）'),
  relationships: z.record(z.string()).optional().describe('与其他角色的关系 { characterName: description }'),
});

export const SceneSchema = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string().describe('场景地点'),
  timeOfDay: z.enum(['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night']),
  characters: z.array(z.string()).describe('出场角色名称'),
  description: z.string().describe('场景描述'),
  dialogue: z.array(
    z.object({
      character: z.string(),
      line: z.string(),
      action: z.string().optional().describe('伴随动作'),
    })
  ),
  visualNotes: z.string().describe('视觉指导（摄影、灯光、情绪基调）'),
  emotionalTone: z.string().describe('情感基调'),
});

export const ScreenwriterInputSchema = z.object({
  trendReport: z
    .object({
      recommendation: z.string(),
      trends: z.array(z.object({ topic: z.string(), summary: z.string() })),
    })
    .optional(),
  manualTheme: z.string().optional(),
  genre: z
    .enum(['romance', 'comedy', 'thriller', 'family', 'fantasy', 'drama'])
    .default('romance'),
  episodeCount: z.number().int().min(1).max(20).default(1),
  targetDuration: z.number().describe('每集目标时长（秒）').default(60),
  targetAudience: z.string().default('18-35岁年轻女性'),
  previousOutput: z.unknown().optional().describe('上一轮剧本（反馈循环使用）'),
  feedback: z.unknown().optional().describe('评审反馈'),
});

export const ScreenwriterOutputSchema = z.object({
  title: z.string(),
  logline: z.string().describe('一句话剧情简介（不超过50字）'),
  synopsis: z.string().describe('剧情概要（200字以内）'),
  characters: z.array(CharacterSchema),
  scenes: z.array(SceneSchema),
  themes: z.array(z.string()).describe('主题标签'),
  marketAnalysis: z.string().describe('市场分析：为何这个剧本符合当下趋势'),
});

// inputSchema 使用了 z.default()，在 exactOptionalPropertyTypes 下需要用 z.input 对齐
export type ScreenwriterInput = z.input<typeof ScreenwriterInputSchema>;
export type ScreenwriterOutput = z.infer<typeof ScreenwriterOutputSchema>;
