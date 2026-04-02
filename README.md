# frame-forge

多 Agent 协作的短剧 AI 全流程自动化生产平台。

从热点趋势收集、AI 编剧、剧本评审、分镜绘制，到视频生成，全程自动化，支持插件化 Agent 扩展和多 LLM/媒体供应商接入。

---

## 功能特性

- **全流程自动化**：热点趋势 → 剧本编写（含 Critic 反馈迭代）→ 分镜图生成 → 视频合成 → 观众评价
- **多 Agent 协作**：编剧、评审、分镜、视频导演、观众等独立 Agent，通过 Pipeline + EventBus 协作
- **可扩展 Agent**：声明式 `AgentDef` 接口，新增 Agent 类型无需修改框架核心
- **多 LLM 供应商**：统一 `LLMProvider` 接口，支持 OpenAI、Anthropic Claude、Google Gemini、DeepSeek、通义千问、GLM、Kimi
- **OpenAI 兼容适配层**：通过 `@frame-forge/llm-openai-compatible` 用统一 OpenAI 格式对接多家模型平台
- **多媒体供应商**：支持 SDXL/FLUX 图像生成，Seedance/Sora/可灵 视频生成
- **实时进度推送**：WebSocket Gateway 将 Pipeline 执行状态实时推送至前端
- **Web Dashboard**：Next.js 15 + TailwindCSS，任务管理、进度可视化、产出物预览

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 包管理 | pnpm workspaces + Turborepo |
| 语言 | TypeScript（Node.js ≥ 20） |
| 后端 | Fastify + WebSocket |
| 前端 | Next.js 15 (App Router) + Zustand + TailwindCSS |
| 数据库 | SQLite (dev) / PostgreSQL (prod) via Drizzle ORM |
| 测试 | Vitest |

---

## 项目结构

```
frame-forge/
├── packages/
│   ├── core/                    # 核心框架（Agent, Tool, LLM, Pipeline, Queue, EventBus）
│   ├── agents/
│   │   ├── trend-scout/         # 热点趋势侦察
│   │   ├── screenwriter/        # 编剧
│   │   ├── critic/              # 剧本评审
│   │   ├── storyboard/          # 分镜绘制
│   │   ├── video-director/      # 视频导演
│   │   └── audience/            # 观众评价
│   ├── llm-providers/
│   │   ├── openai-compatible/   # OpenAI 格式统一适配层
│   │   ├── openai/              # OpenAI
│   │   ├── anthropic/           # Anthropic Claude
│   │   ├── gemini/              # Google Gemini
│   │   ├── deepseek/            # DeepSeek（OpenAI-compatible）
│   │   ├── qwen/                # 通义千问（OpenAI-compatible）
│   │   ├── glm/                 # 智谱 GLM（OpenAI-compatible）
│   │   └── kimi/                # Moonshot Kimi（OpenAI-compatible）
│   ├── media-providers/
│   │   ├── image/               # 图像生成（SDXL/FLUX/MJ）
│   │   └── video/               # 视频生成（Seedance/Sora/Kling）
│   ├── api/                     # 后端 Fastify API
│   └── web/                     # 前端 Next.js Dashboard
└── Document/                    # 内部规划文档（.gitignore）
```

---

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入 API Key：

```env
# LLM 供应商（至少配置一个）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
QWEN_API_KEY=...
GLM_API_KEY=...
KIMI_API_KEY=...

# 图像生成（可选）
SDXL_API_KEY=...

# 视频生成（可选）
SEEDANCE_API_KEY=...
KLING_API_KEY=...

# 前端配置
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```

### 启动开发服务

```bash
# 同时启动后端 API 和前端
pnpm dev

# 或分别启动
pnpm -F @frame-forge/api dev    # API: http://localhost:3001
pnpm -F @frame-forge/web dev    # Web: http://localhost:3000
```

### 运行测试

```bash
pnpm test

# 只跑 core 包测试
pnpm -F @frame-forge/core test
```

---

## 扩展指南

### 添加新的 Agent 类型

```typescript
// 1. 在 packages/agents/my-agent/src/index.ts 定义
import type { AgentDef } from '@frame-forge/core';

export const myAgentDef: AgentDef = {
  id: 'my-agent-v1',
  role: 'my-custom-role',
  systemPrompt: '你是一个...',
  tools: [],
  llmConfig: { providerId: 'anthropic', model: 'claude-3-5-sonnet-latest' },
};

// 2. 在 packages/api/src/plugins/container.ts 注册
agentRegistry.register(myAgentDef);
```

### 添加新的 LLM 供应商

```typescript
// 1. 实现 LLMProvider 接口
import type { LLMProvider } from '@frame-forge/core';

export class MyLLMProvider implements LLMProvider {
  readonly id = 'my-provider';
  readonly supportedModels = ['my-model'];

  async complete(req) { /* ... */ }
  async *stream(req) { /* ... */ }
}

// 2. 注册
llmRegistry.register(new MyLLMProvider({ apiKey: process.env.MY_API_KEY }));
```

---

## 许可证

AGPL-3.0 — 详见 [LICENSE](./LICENSE)
