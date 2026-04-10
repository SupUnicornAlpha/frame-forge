'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, type TaskDetail } from '@/lib/api';
import { useWsStore } from '@/stores/wsStore';

const STEP_LABELS: Record<string, string> = {
  'trend-collection': '热点收集',
  'script-writing': '剧本编写',
  'storyboard-generation': '分镜生成',
  'video-generation': '视频生成',
  'final-evaluation': '综合评价',
};

const STATUS_ICON: Record<string, string> = {
  pending: '⏳',
  running: '⚡',
  completed: '✅',
  failed: '❌',
};

interface WsEvent {
  type: string;
  taskId?: string;
  stepId?: string;
  agentRole?: string;
  score?: number;
  iteration?: number;
  [key: string]: unknown;
}

const PROVIDERS = ['openai', 'anthropic', 'gemini', 'deepseek', 'qwen', 'glm', 'kimi'];

function statusTone(status: string): { badge: string; text: string; track: string } {
  if (status === 'completed') {
    return {
      badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      text: 'text-emerald-700',
      track: 'bg-emerald-500',
    };
  }
  if (status === 'running') {
    return {
      badge: 'bg-blue-100 text-blue-700 border border-blue-200',
      text: 'text-blue-700',
      track: 'bg-blue-500',
    };
  }
  if (status === 'failed') {
    return {
      badge: 'bg-rose-100 text-rose-700 border border-rose-200',
      text: 'text-rose-700',
      track: 'bg-rose-500',
    };
  }
  return {
    badge: 'bg-slate-100 text-slate-600 border border-slate-200',
    text: 'text-slate-500',
    track: 'bg-slate-400',
  };
}

export function TaskDetailClient({ initialTask }: { initialTask: TaskDetail }) {
  const [task] = useState<TaskDetail>(initialTask);
  const [providerId, setProviderId] = useState('openai');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const { connect, subscribe, events } = useWsStore();
  const subscribed = useRef(false);

  useEffect(() => {
    connect();
    if (!subscribed.current) {
      subscribe(initialTask.id);
      subscribed.current = true;
    }
  }, [connect, subscribe, initialTask.id]);

  const taskEvents = events.filter((e) => e.taskId === initialTask.id);

  const steps = [
    'trend-collection',
    'script-writing',
    'storyboard-generation',
    'video-generation',
    'final-evaluation',
  ];

  const getStepStatus = (stepId: string) => {
    const stepRecord = task.steps.find((s) => s.stepId === stepId);
    if (stepRecord) return stepRecord.status;
    const latestEvent = [...taskEvents].reverse().find((e) => e.stepId === stepId);
    if (!latestEvent) return 'pending';
    if (latestEvent.type === 'pipeline.step.completed') return 'completed';
    if (latestEvent.type === 'pipeline.step.started') return 'running';
    if (latestEvent.type === 'pipeline.step.failed') return 'failed';
    return 'pending';
  };

  const sendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await api.tasks.chat(initialTask.id, {
        message,
        providerId,
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `请求失败：${(err as Error).message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="ff-panel p-5 relative overflow-hidden">
        <div className="absolute -top-16 right-0 w-44 h-44 rounded-full bg-fuchsia-300/25 blur-3xl" />
        <p className="text-[11px] uppercase tracking-[0.16em] text-pink-500 font-semibold">Task Observatory</p>
        <h1 className="text-2xl font-bold ff-ig-text">{task.name}</h1>
        <p className="text-sm text-slate-500 mt-1">任务 ID: {task.id}</p>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Link
            href={`/tasks/${task.id}/canvas`}
            className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg border border-white/70 bg-white/75 text-fuchsia-700 hover:bg-white"
          >
            打开该任务运行画布
          </Link>
          <span className="ff-ig-chip">
            实时事件 {taskEvents.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="ff-panel p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Pipeline 进度</h2>
            <div className="space-y-3">
              {steps.map((stepId, i) => {
                const status = getStepStatus(stepId);
                const tone = statusTone(status);
                return (
                  <div key={stepId} className="flex items-center gap-3 p-2 rounded-xl bg-white/70 border border-white/80 backdrop-blur">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tone.badge}`}>
                      {STATUS_ICON[status] ?? i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {STEP_LABELS[stepId] ?? stepId}
                      </p>
                      {status === 'running' && (
                        <div className="h-1.5 mt-1 bg-slate-200/80 rounded-full overflow-hidden relative">
                          <div className={`absolute inset-y-0 left-0 w-1/3 rounded-full ${tone.track} animate-ff-slide`} />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${tone.text}`}>
                      {status === 'completed' ? '完成' : status === 'running' ? '进行中' : status === 'failed' ? '失败' : '待处理'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {task.artifacts.length > 0 && (
            <div className="ff-panel p-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">产出物</h2>
              <div className="grid grid-cols-2 gap-3">
                {task.artifacts.map((artifact) => (
                  <ArtifactCard key={artifact.id} artifact={artifact} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="ff-panel p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">与 Agent 交流</h2>
            <div className="mb-2 flex items-center gap-2">
              <label className="text-xs text-slate-500">供应商</label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white/90"
              >
                {PROVIDERS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400">使用服务端配置 token</span>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto bg-white/70 rounded-lg p-2 border border-white/80 backdrop-blur">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">可以直接提问：当前任务风险、下一步建议、为什么卡住等。</p>
              ) : (
                chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded-lg ${
                      m.role === 'user' ? 'bg-fuchsia-100/90 text-fuchsia-900 border border-fuchsia-200' : 'bg-white/90 text-slate-700 border border-slate-100'
                    }`}
                  >
                    <span className="font-semibold mr-1">{m.role === 'user' ? '你' : 'Agent'}</span>
                    {m.content}
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void sendChat();
                }}
                className="flex-1 rounded-lg border border-white/80 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
                placeholder="问问 Agent：这个任务现在最关键的问题是什么？"
              />
              <button
                onClick={() => void sendChat()}
                disabled={chatLoading}
                className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white disabled:opacity-50"
              >
                {chatLoading ? '发送中...' : '发送'}
              </button>
            </div>
          </div>

          <div className="ff-panel p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">实时事件</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {taskEvents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">等待事件...</p>
              ) : (
                [...taskEvents].reverse().map((event, i) => (
                  <EventItem key={i} event={event} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: { type: string; url: string | null; content: string | null } }) {
  const icons: Record<string, string> = {
    trend_report: '📊',
    script: '📝',
    script_evaluation: '⭐',
    storyboard_image: '🖼️',
    video_clip: '🎬',
    final_evaluation: '🏆',
  };

  return (
    <div className="p-3 bg-white/75 rounded-xl border border-white/80 hover:border-fuchsia-200 transition-colors backdrop-blur">
      <div className="flex items-center gap-2 mb-1">
        <span>{icons[artifact.type] ?? '📄'}</span>
        <span className="text-xs font-medium text-slate-600 capitalize">
          {artifact.type.replace(/_/g, ' ')}
        </span>
      </div>
      {artifact.url && (
        <a
          href={artifact.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-fuchsia-600 hover:underline"
        >
          查看
        </a>
      )}
    </div>
  );
}

function EventItem({ event }: { event: WsEvent }) {
  const labels: Record<string, string> = {
    'task.started': '任务开始',
    'task.completed': '任务完成',
    'task.failed': '任务失败',
    'pipeline.step.started': `步骤开始`,
    'pipeline.step.completed': `步骤完成`,
    'agent.run.started': `Agent 启动`,
    'agent.run.completed': `Agent 完成`,
    'feedback.loop.iteration': `评审循环`,
    'media.generated': '媒体生成',
  };

  const colorClass = event.type?.includes('failed')
    ? 'text-red-600'
    : event.type?.includes('completed')
    ? 'text-green-600'
    : event.type?.includes('started')
    ? 'text-blue-600'
    : 'text-slate-600';
  const dotClass = event.type?.includes('failed')
    ? 'bg-rose-500'
    : event.type?.includes('completed')
    ? 'bg-emerald-500'
    : event.type?.includes('started')
    ? 'bg-blue-500 animate-ff-breathe'
    : 'bg-slate-400';

  return (
    <div className={`text-xs ${colorClass} border border-slate-100 rounded-lg p-2 bg-white`}>
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full mt-1.5 ${dotClass}`} />
        <div className="min-w-0">
          <span className="font-medium">{labels[event.type] ?? event.type}</span>
          {event.stepId && (
            <span className="text-slate-400"> · {event.stepId}</span>
          )}
          {typeof event.score === 'number' && (
            <span className="text-slate-400"> · 评分 {event.score}</span>
          )}
        </div>
      </div>
    </div>
  );
}
