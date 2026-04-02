import type { PipelineDef } from '@frame-forge/core';

/**
 * 短剧生产流水线定义。
 *
 * 步骤：
 * 1. trend-scout：收集热点趋势
 * 2. screenwriter：编写剧本（含 critic 反馈循环，最多 5 轮）
 * 3. storyboard：生成分镜图（并行处理各场景）
 * 4. video-director：生成视频片段
 * 5. audience：综合评价
 */
export function getShortDramaPipeline(): PipelineDef {
  return {
    id: 'short-drama-v1',
    name: '短剧全流程生产',
    steps: [
      {
        id: 'trend-collection',
        agentRole: 'trend-scout',
      },
      {
        id: 'script-writing',
        agentRole: 'screenwriter',
        feedbackLoop: {
          evaluatorRole: 'critic',
          maxIterations: 5,
        },
      },
      {
        id: 'storyboard-generation',
        agentRole: 'storyboard',
        parallel: true,
      },
      {
        id: 'video-generation',
        agentRole: 'video-director',
      },
      {
        id: 'final-evaluation',
        agentRole: 'audience',
      },
    ],
  };
}
