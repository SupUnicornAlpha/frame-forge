import { z } from 'zod';

export const CriticInputSchema = z.object({
  script: z.unknown().describe('待评审的剧本（ScreenwriterOutput 格式）'),
});

export const CriticOutputSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean().describe('是否达到上线标准（>= 75分）'),
  dimensions: z.object({
    marketFit: z.number().min(0).max(100).describe('市场适配性'),
    structure: z.number().min(0).max(100).describe('结构完整性'),
    originality: z.number().min(0).max(100).describe('差异化/原创性'),
    compliance: z.number().min(0).max(100).describe('合规性'),
    characterDevelopment: z.number().min(0).max(100).describe('人物塑造'),
  }),
  feedback: z.string().describe('综合评价'),
  suggestions: z.array(z.string()).describe('具体修改建议'),
  hardIssues: z.array(z.string()).describe('硬伤问题（逻辑漏洞、错误等）'),
});

export type CriticInput = z.infer<typeof CriticInputSchema>;
export type CriticOutput = z.infer<typeof CriticOutputSchema>;
