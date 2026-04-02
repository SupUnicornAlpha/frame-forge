import type { ImageProvider, MediaProviderRegistry, VideoProvider } from './types.js';

export class InMemoryMediaProviderRegistry implements MediaProviderRegistry {
  private readonly imageProviders = new Map<string, ImageProvider>();
  private readonly videoProviders = new Map<string, VideoProvider>();
  private defaultImageId: string | null = null;
  private defaultVideoId: string | null = null;

  registerImage(provider: ImageProvider): void {
    this.imageProviders.set(provider.id, provider);
    if (this.defaultImageId === null) this.defaultImageId = provider.id;
  }

  registerVideo(provider: VideoProvider): void {
    this.videoProviders.set(provider.id, provider);
    if (this.defaultVideoId === null) this.defaultVideoId = provider.id;
  }

  getImage(id: string): ImageProvider {
    const p = this.imageProviders.get(id);
    if (!p) throw new Error(`Image provider "${id}" not found`);
    return p;
  }

  getVideo(id: string): VideoProvider {
    const p = this.videoProviders.get(id);
    if (!p) throw new Error(`Video provider "${id}" not found`);
    return p;
  }

  getDefaultImage(): ImageProvider {
    if (!this.defaultImageId) throw new Error('No image providers registered');
    return this.getImage(this.defaultImageId);
  }

  getDefaultVideo(): VideoProvider {
    if (!this.defaultVideoId) throw new Error('No video providers registered');
    return this.getVideo(this.defaultVideoId);
  }

  setDefaultImage(id: string): void {
    if (!this.imageProviders.has(id)) throw new Error(`Image provider "${id}" not found`);
    this.defaultImageId = id;
  }

  setDefaultVideo(id: string): void {
    if (!this.videoProviders.has(id)) throw new Error(`Video provider "${id}" not found`);
    this.defaultVideoId = id;
  }
}
