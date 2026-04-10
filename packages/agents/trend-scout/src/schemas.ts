import { z } from 'zod';

export const TrendScoutInputSchema = z.object({
  platforms: z
    .array(z.enum(['weibo', 'douyin', 'twitter', 'bilibili', 'xiaohongshu']))
    .default(['weibo', 'douyin']),
  categories: z
    .array(z.string())
    .default(['entertainment', 'emotion', 'society', 'comedy'])
    .describe('话题分类'),
  limit: z.number().int().min(1).max(50).default(10),
  manualTheme: z.string().optional().describe('手动指定主题，绕过趋势收集'),
});

export const TrendScoutOutputSchema = z.object({
  trends: z.array(
    z.object({
      topic: z.string().describe('话题名称'),
      hotScore: z.number().min(0).max(100).describe('热度评分'),
      platform: z.string(),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      tags: z.array(z.string()),
      suitableGenres: z
        .array(z.enum(['romance', 'comedy', 'thriller', 'family', 'fantasy', 'drama']))
        .describe('适合的剧情类型'),
      summary: z.string().describe('话题简述'),
    })
  ),
  collectedAt: z.string().describe('ISO 8601 时间戳'),
  recommendation: z.string().describe('综合推荐：最适合作为短剧主题的话题及原因'),
});

// inputSchema 使用了 z.default()，在 exactOptionalPropertyTypes 下需要用 z.input 对齐
export type TrendScoutInput = z.input<typeof TrendScoutInputSchema>;
export type TrendScoutOutput = z.infer<typeof TrendScoutOutputSchema>;
