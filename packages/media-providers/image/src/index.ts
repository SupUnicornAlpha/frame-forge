import type {
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageProvider,
} from '@frame-forge/core';

export class MockImageProvider implements ImageProvider {
  readonly id = 'mock-image';

  async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const seed = req.seed ?? Date.now();
    const width = req.width ?? 1024;
    const height = req.height ?? 576;
    return {
      url: `https://picsum.photos/seed/${seed}/${width}/${height}`,
      width,
      height,
      seed,
      revisedPrompt: req.prompt,
    };
  }
}

export interface GenericImageProviderConfig {
  id: string;
}

export class GenericImageProvider implements ImageProvider {
  readonly id: string;

  constructor(config: GenericImageProviderConfig) {
    this.id = config.id;
  }

  async generate(req: ImageGenerationRequest): Promise<ImageGenerationResult> {
    throw new Error(
      `${this.id} is not implemented yet. Incoming prompt: ${req.prompt.slice(0, 80)}`
    );
  }
}
