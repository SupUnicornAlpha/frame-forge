/** 图像生成请求 */
export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  style?: string | undefined;
  /** 人物一致性参考图 URL 列表 */
  referenceImages?: string[] | undefined;
  seed?: number | undefined;
}

export interface ImageGenerationResult {
  url: string;
  width: number;
  height: number;
  seed?: number | undefined;
  revisedPrompt?: string | undefined;
}

/**
 * 图像生成 Provider 接口。
 * 实现：SDXL、FLUX、Midjourney、即梦 等。
 */
export interface ImageProvider {
  readonly id: string;
  generate(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

/** 视频生成请求 */
export interface VideoGenerationRequest {
  prompt: string;
  /** 分镜首帧图像 URL（图生视频） */
  referenceImage?: string | undefined;
  /** 时长（秒） */
  duration?: number | undefined;
  fps?: number | undefined;
  resolution?: '480p' | '720p' | '1080p' | '4k' | undefined;
  style?: string | undefined;
}

export type VideoTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoGenerationResult {
  url: string;
  duration: number;
  resolution: string;
}

/**
 * 视频生成 Provider 接口（异步模式）。
 *
 * 视频生成通常耗时较长，采用 submit（提交）+ query（轮询）两段式设计。
 * 实现：Seedance、Sora、可灵（Kling）、即梦视频 等。
 */
export interface VideoProvider {
  readonly id: string;
  submit(req: VideoGenerationRequest): Promise<{ taskId: string }>;
  query(taskId: string): Promise<{
    status: VideoTaskStatus;
    result?: VideoGenerationResult | undefined;
    errorMessage?: string | undefined;
  }>;
}

/** Media Provider 注册表（图像 + 视频统一管理） */
export interface MediaProviderRegistry {
  registerImage(provider: ImageProvider): void;
  registerVideo(provider: VideoProvider): void;
  getImage(id: string): ImageProvider;
  getVideo(id: string): VideoProvider;
  getDefaultImage(): ImageProvider;
  getDefaultVideo(): VideoProvider;
  setDefaultImage(id: string): void;
  setDefaultVideo(id: string): void;
}
