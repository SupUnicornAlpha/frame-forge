'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, type TaskDetail } from '@/lib/api';

type NodeId =
  | 'trend-collection'
  | 'script-writing'
  | 'script-critic'
  | 'storyboard-generation'
  | 'video-generation'
  | 'final-evaluation';
type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'unknown';

interface NodeDef {
  id: NodeId;
  label: string;
  x: number;
  y: number;
}

const NODES: NodeDef[] = [
  { id: 'trend-collection', label: '热点采集', x: 120, y: 180 },
  { id: 'script-writing', label: '剧本编写', x: 360, y: 180 },
  { id: 'script-critic', label: '剧本评测', x: 360, y: 330 },
  { id: 'storyboard-generation', label: '分镜生成', x: 600, y: 180 },
  { id: 'video-generation', label: '视频生成', x: 840, y: 180 },
  { id: 'final-evaluation', label: '终评', x: 1080, y: 180 },
];

const EDGES: Array<{ from: NodeId; to: NodeId; loop?: boolean }> = [
  { from: 'trend-collection', to: 'script-writing' },
  { from: 'script-writing', to: 'storyboard-generation' },
  { from: 'storyboard-generation', to: 'video-generation' },
  { from: 'video-generation', to: 'final-evaluation' },
  { from: 'script-writing', to: 'script-critic', loop: true },
  { from: 'script-critic', to: 'script-writing', loop: true },
];

const TOOLS = [
  { title: '提示词', desc: '文本生成节点' },
  { title: '图片生成', desc: '分镜图节点' },
  { title: '视频生成', desc: '视频片段节点' },
  { title: '评测', desc: '质量评估节点' },
  { title: '素材上传', desc: '参考素材输入' },
];

const TOKEN_STORAGE_KEY = 'frame_forge_provider_tokens_v1';
const PROVIDER_TOKEN_KEY: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  qwen: 'QWEN_API_KEY',
  glm: 'GLM_API_KEY',
  kimi: 'KIMI_API_KEY',
};

function normalizeStatus(raw?: string | null): StepStatus {
  if (raw === 'pending' || raw === 'running' || raw === 'completed' || raw === 'failed') return raw;
  return 'unknown';
}

function statusColor(status: StepStatus): string {
  if (status === 'running') return 'border-cyan-400/80 bg-cyan-500/15 text-cyan-200';
  if (status === 'completed') return 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200';
  if (status === 'failed') return 'border-rose-400/70 bg-rose-500/10 text-rose-200';
  return 'border-violet-400/30 bg-violet-500/5 text-violet-100';
}

function mapStates(task: TaskDetail): Record<NodeId, StepStatus> {
  const byId = new Map(task.steps.map((s) => [s.stepId, s.status]));
  const script = normalizeStatus(byId.get('script-writing'));
  const scriptIterations = task.steps.find((s) => s.stepId === 'script-writing')?.iterations ?? 0;
  return {
    'trend-collection': normalizeStatus(byId.get('trend-collection')),
    'script-writing': script,
    'script-critic':
      scriptIterations > 1 ? (script === 'failed' ? 'failed' : script === 'completed' ? 'completed' : 'running') : 'pending',
    'storyboard-generation': normalizeStatus(byId.get('storyboard-generation')),
    'video-generation': normalizeStatus(byId.get('video-generation')),
    'final-evaluation': normalizeStatus(byId.get('final-evaluation')),
  };
}

export default function TaskCanvasStudioClient({ initialTask }: { initialTask: TaskDetail }) {
  const [task, setTask] = useState(initialTask);
  const [selectedNode, setSelectedNode] = useState<NodeId>('script-writing');
  const [providerId, setProviderId] = useState('openai');
  const [tokenMap, setTokenMap] = useState<Record<string, string>>({});
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const next = await api.tasks.get(initialTask.id);
        setTask(next);
      } catch {
        // keep old state
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [initialTask.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      setTokenMap(parsed);
      const firstConfigured = Object.entries(PROVIDER_TOKEN_KEY).find(([, envKey]) =>
        Boolean(parsed[envKey]?.trim())
      );
      if (firstConfigured) setProviderId(firstConfigured[0]);
    } catch {
      // ignore
    }
  }, []);

  const states = useMemo(() => mapStates(task), [task]);

  const sendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const tokenEnvKey = PROVIDER_TOKEN_KEY[providerId];
      const apiKey = tokenEnvKey ? tokenMap[tokenEnvKey] : undefined;
      const res = await api.tasks.chat(task.id, {
        message,
        providerId,
        ...(apiKey ? { apiKey } : {}),
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `请求失败：${(err as Error).message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] bg-[#08091a] text-violet-100 px-3 py-3">
      <div className="h-full grid grid-cols-[250px_1fr_300px] gap-3">
        <aside className="rounded-2xl border border-violet-500/20 bg-[#10122a]/90 p-3 overflow-auto">
          <p className="text-sm font-semibold mb-3">工具箱</p>
          <div className="space-y-2">
            {TOOLS.map((tool) => (
              <div key={tool.title} className="rounded-xl border border-violet-400/20 bg-[#161834] p-2">
                <p className="text-sm">{tool.title}</p>
                <p className="text-[11px] text-violet-200/70 mt-0.5">{tool.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-violet-200/70">
            <p>任务：{task.name}</p>
            <p className="mt-1">状态：{task.status}</p>
            <Link href={`/tasks/${task.id}`} className="inline-block mt-2 text-cyan-300 hover:underline">
              返回任务详情
            </Link>
          </div>
        </aside>

        <main className="rounded-2xl border border-violet-500/20 bg-[#0d0f24] relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,#6d28d933_1px,transparent_1px)] bg-[length:24px_24px]" />
          <svg viewBox="0 0 1280 560" className="relative z-10 w-full h-full">
            {EDGES.map((edge) => {
              const from = NODES.find((n) => n.id === edge.from)!;
              const to = NODES.find((n) => n.id === edge.to)!;
              const x1 = from.x + 170;
              const y1 = from.y + 40;
              const x2 = to.x;
              const y2 = to.y + 40;
              const path = edge.loop
                ? `M ${x1} ${y1} C ${x1 + 70} ${y1 + 40}, ${x2 - 70} ${y2 + 40}, ${x2} ${y2}`
                : `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`;
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={path}
                  className="fill-none stroke-violet-400/50"
                  strokeWidth={2.2}
                />
              );
            })}
            {NODES.map((node) => {
              const status = states[node.id];
              const active = selectedNode === node.id;
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedNode(node.id)} className="cursor-pointer">
                  <rect
                    width="170"
                    height="80"
                    rx="12"
                    className={`${statusColor(status)} ${active ? 'stroke-2' : 'stroke-1'}`}
                  />
                  <text x="12" y="30" className="fill-current text-[14px] font-semibold">
                    {node.label}
                  </text>
                  <text x="12" y="54" className="fill-current text-[11px] opacity-80">
                    {status}
                  </text>
                </g>
              );
            })}
          </svg>
        </main>

        <aside className="rounded-2xl border border-violet-500/20 bg-[#10122a]/90 p-3 flex flex-col">
          <p className="text-sm font-semibold mb-2">kaguya · 对话助手</p>
          <div className="mb-2 flex items-center gap-2">
            <label className="text-[11px] text-violet-200/70">供应商</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="text-[11px] border border-violet-400/30 rounded-md px-2 py-1 bg-[#0b0d23]"
            >
              {Object.keys(PROVIDER_TOKEN_KEY).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-violet-300/70">
              {PROVIDER_TOKEN_KEY[providerId] && tokenMap[PROVIDER_TOKEN_KEY[providerId]]
                ? '已配置 token'
                : '未配置 token'}
            </span>
          </div>
          <div className="rounded-lg border border-violet-400/20 bg-[#171935] px-2 py-1 text-xs mb-3">
            当前节点：{NODES.find((n) => n.id === selectedNode)?.label}
          </div>
          <div className="flex-1 overflow-auto space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-violet-200/70">可直接问：这个节点为什么卡住？下一步如何推进？</p>
            ) : (
              chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`text-xs p-2 rounded-lg ${
                    m.role === 'user' ? 'bg-fuchsia-500/20 text-fuchsia-100' : 'bg-[#1d2040] text-violet-100'
                  }`}
                >
                  <span className="font-semibold mr-1">{m.role === 'user' ? '你' : 'Agent'}</span>
                  {m.content}
                </div>
              ))
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void sendChat();
              }}
              className="flex-1 rounded-lg border border-violet-400/30 bg-[#0b0d23] px-3 py-2 text-xs outline-none"
              placeholder="输入你的问题..."
            />
            <button
              onClick={() => void sendChat()}
              disabled={chatLoading}
              className="rounded-lg bg-violet-600 px-3 py-2 text-xs text-white disabled:opacity-50"
            >
              {chatLoading ? '发送中' : '发送'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

