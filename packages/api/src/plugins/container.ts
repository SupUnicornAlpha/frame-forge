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

  // 开发环境自动注册 MockLLMProvider，避免缺少真实 API Key 时启动失败
  if (process.env['NODE_ENV'] !== 'production' && llmRegistry.listAll().length === 0) {
    llmRegistry.register(new MockLLMProvider('mock'));
  }

  // 从环境变量注册真实 LLM Providers（运行时动态）
  registerProvidersFromEnv(llmRegistry);

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
async function registerProvidersFromEnv(
  llmRegistry: InMemoryLLMProviderRegistry
): Promise<void> {
  if (process.env['OPENAI_API_KEY']) {
    try {
      const { OpenAIProvider } = await import('@frame-forge/llm-openai');
      llmRegistry.register(new OpenAIProvider({ apiKey: process.env['OPENAI_API_KEY'] }));
    } catch {
      // package might not be installed yet
    }
  }

  if (process.env['ANTHROPIC_API_KEY']) {
    try {
      const { AnthropicProvider } = await import('@frame-forge/llm-anthropic');
      llmRegistry.register(new AnthropicProvider({ apiKey: process.env['ANTHROPIC_API_KEY'] }));
    } catch {
      // package might not be installed yet
    }
  }
}
