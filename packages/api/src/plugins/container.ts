import {
  InMemoryAgentRegistry,
  InMemoryLLMProviderRegistry,
  InMemoryToolRegistry,
  InMemoryCommandQueue,
  InMemoryEventBus,
  InMemoryMediaProviderRegistry,
  StandardAgentRunner,
  PipelineRunner,
  MockLLMProvider,
} from '@frame-forge/core';
import { trendScoutAgentDef } from '@frame-forge/agent-trend-scout';
import { screenwriterAgentDef } from '@frame-forge/agent-screenwriter';
import { criticAgentDef } from '@frame-forge/agent-critic';
import { storyboardAgentDef } from '@frame-forge/agent-storyboard';
import { videoDirectorAgentDef } from '@frame-forge/agent-video-director';
import { audienceAgentDef } from '@frame-forge/agent-audience';
import { OpenAIProvider } from '@frame-forge/llm-openai';
import { AnthropicProvider } from '@frame-forge/llm-anthropic';
import { GeminiProvider } from '@frame-forge/llm-gemini';
import { DeepSeekProvider } from '@frame-forge/llm-deepseek';
import { QwenProvider } from '@frame-forge/llm-qwen';
import { GlmProvider } from '@frame-forge/llm-glm';
import { KimiProvider } from '@frame-forge/llm-kimi';
import { MockImageProvider } from '@frame-forge/media-image';
import { MockVideoProvider } from '@frame-forge/media-video';

export interface AppContainer {
  agentRegistry: InMemoryAgentRegistry;
  llmRegistry: InMemoryLLMProviderRegistry;
  toolRegistry: InMemoryToolRegistry;
  commandQueue: InMemoryCommandQueue;
  eventBus: InMemoryEventBus;
  mediaRegistry: InMemoryMediaProviderRegistry;
  agentRunner: StandardAgentRunner;
  pipelineRunner: PipelineRunner;
}

/**
 * 创建并初始化应用依赖容器。
 *
 * 注册所有内置 Agent，配置依赖，返回统一的容器对象。
 * LLM Provider 需在启动时通过环境变量/配置注入。
 */
export function createContainer(): AppContainer {
  const llmRegistry = new InMemoryLLMProviderRegistry();
  const toolRegistry = new InMemoryToolRegistry();
  const commandQueue = new InMemoryCommandQueue();
  const eventBus = new InMemoryEventBus();
  const mediaRegistry = new InMemoryMediaProviderRegistry();
  const agentRunner = new StandardAgentRunner(llmRegistry, toolRegistry);
  const agentRegistry = new InMemoryAgentRegistry();

  agentRegistry.register(trendScoutAgentDef);
  agentRegistry.register(screenwriterAgentDef);
  agentRegistry.register(criticAgentDef);
  agentRegistry.register(storyboardAgentDef);
  agentRegistry.register(videoDirectorAgentDef);
  agentRegistry.register(audienceAgentDef);

  registerProvidersFromEnv(llmRegistry);
  registerMediaProviders(mediaRegistry);

  // 开发环境兜底：没有任何模型配置时启用 mock
  if (process.env['NODE_ENV'] !== 'production' && llmRegistry.listAll().length === 0) {
    llmRegistry.register(new MockLLMProvider('mock'));
  }

  const pipelineRunner = new PipelineRunner({
    agentRegistry,
    agentRunner,
    eventBus,
    commandQueue,
  });

  return {
    agentRegistry,
    llmRegistry,
    toolRegistry,
    commandQueue,
    eventBus,
    mediaRegistry,
    agentRunner,
    pipelineRunner,
  };
}

/**
 * 从环境变量动态注册已配置的 LLM Provider。
 * 实际 Provider 实现在对应包中，此处动态 import 以避免循环依赖。
 */
function registerProvidersFromEnv(llmRegistry: InMemoryLLMProviderRegistry): void {
  if (process.env['OPENAI_API_KEY']) {
    llmRegistry.register(new OpenAIProvider({ apiKey: process.env['OPENAI_API_KEY'] }));
  }
  if (process.env['ANTHROPIC_API_KEY']) {
    llmRegistry.register(new AnthropicProvider({ apiKey: process.env['ANTHROPIC_API_KEY'] }));
  }
  if (process.env['GEMINI_API_KEY']) {
    llmRegistry.register(new GeminiProvider({ apiKey: process.env['GEMINI_API_KEY'] }));
  }
  if (process.env['DEEPSEEK_API_KEY']) {
    llmRegistry.register(new DeepSeekProvider({ apiKey: process.env['DEEPSEEK_API_KEY'] }));
  }
  if (process.env['QWEN_API_KEY']) {
    llmRegistry.register(new QwenProvider({ apiKey: process.env['QWEN_API_KEY'] }));
  }
  if (process.env['GLM_API_KEY']) {
    llmRegistry.register(new GlmProvider({ apiKey: process.env['GLM_API_KEY'] }));
  }
  if (process.env['KIMI_API_KEY']) {
    llmRegistry.register(new KimiProvider({ apiKey: process.env['KIMI_API_KEY'] }));
  }
}

function registerMediaProviders(mediaRegistry: InMemoryMediaProviderRegistry): void {
  mediaRegistry.registerImage(new MockImageProvider());
  mediaRegistry.registerVideo(new MockVideoProvider());
}
