import type {
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoProvider,
  VideoTaskStatus,
} from '@frame-forge/core';

type VideoTask = {
  id: string;
  status: VideoTaskStatus;
  request: VideoGenerationRequest;
  result?: VideoGenerationResult | undefined;
};

export class MockVideoProvider implements VideoProvider {
  readonly id = 'mock-video';
  private readonly tasks = new Map<string, VideoTask>();

  async submit(req: VideoGenerationRequest): Promise<{ taskId: string }> {
    const taskId = `mock-video-${Date.now()}`;
    const task: VideoTask = {
      id: taskId,
      status: 'processing',
      request: req,
      result: {
        url: `https://example.com/mock-video/${taskId}.mp4`,
        duration: req.duration ?? 5,
        resolution: req.resolution ?? '720p',
      },
    };
    this.tasks.set(taskId, task);
    return { taskId };
  }

  async query(taskId: string): Promise<{
    status: VideoTaskStatus;
    result?: VideoGenerationResult | undefined;
    errorMessage?: string | undefined;
  }> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { status: 'failed', errorMessage: `Task not found: ${taskId}` };
    }
    task.status = 'completed';
    return { status: task.status, result: task.result };
  }
}

export interface GenericVideoProviderConfig {
  id: string;
}

export class GenericVideoProvider implements VideoProvider {
  readonly id: string;

  constructor(config: GenericVideoProviderConfig) {
    this.id = config.id;
  }

  async submit(req: VideoGenerationRequest): Promise<{ taskId: string }> {
    throw new Error(
      `${this.id} submit is not implemented yet. Incoming prompt: ${req.prompt.slice(0, 80)}`
    );
  }

  async query(_taskId: string): Promise<{
    status: VideoTaskStatus;
    result?: VideoGenerationResult | undefined;
    errorMessage?: string | undefined;
  }> {
    return {
      status: 'failed',
      errorMessage: `${this.id} query is not implemented yet`,
    };
  }
}
