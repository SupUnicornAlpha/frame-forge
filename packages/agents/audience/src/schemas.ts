import { z } from 'zod';

export const AudienceInputSchema = z.object({
  evaluationType: z.enum(['script', 'storyboard', 'video', 'full']),
  script: z.unknown().optional(),
  storyboard: z.unknown().optional(),
  videoOutput: z.unknown().optional(),
  targetAudience: z.string().default('18-35岁年轻用户'),
  platform: z.enum(['douyin', 'kuaishou', 'bilibili', 'weibo']).default('douyin'),
});

export const AudienceOutputSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  dimensions: z.object({
    visualAppeal: z.number().min(0).max(100).describe('视觉吸引力'),
    plotEngagement: z.number().min(0).max(100).describe('情节吸引力'),
    coherence: z.number().min(0).max(100).describe('连贯性（图像/视频）'),
    emotionalResonance: z.number().min(0).max(100).describe('情感共鸣'),
    viralPotential: z.number().min(0).max(100).describe('传播潜力'),
  }),
  feedback: z.string().describe('综合评价'),
  suggestions: z.array(z.string()),
  predictedViews: z.string().describe('预估播放量区间'),
  targetAudienceFit: z.string().describe('与目标受众的契合度分析'),
});

export type AudienceInput = z.infer<typeof AudienceInputSchema>;
export type AudienceOutput = z.infer<typeof AudienceOutputSchema>;
