'use client';

import { useEffect, useRef, useState } from 'react';
import type { TaskDetail } from '@/lib/api';
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

export function TaskDetailClient({ initialTask }: { initialTask: TaskDetail }) {
  const [task] = useState<TaskDetail>(initialTask);
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{task.name}</h1>
        <p className="text-sm text-slate-500 mt-1">任务 ID: {task.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Pipeline 进度</h2>
            <div className="space-y-3">
              {steps.map((stepId, i) => {
                const status = getStepStatus(stepId);
                return (
                  <div key={stepId} className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {STATUS_ICON[status] ?? i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {STEP_LABELS[stepId] ?? stepId}
                      </p>
                      {status === 'running' && (
                        <div className="h-1 mt-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full animate-pulse-slow w-1/2" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        status === 'completed'
                          ? 'text-green-600'
                          : status === 'running'
                          ? 'text-blue-600'
                          : status === 'failed'
                          ? 'text-red-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {status === 'completed' ? '完成' : status === 'running' ? '进行中' : status === 'failed' ? '失败' : '待处理'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {task.artifacts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
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
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
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
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
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
          className="text-xs text-purple-600 hover:underline"
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

  return (
    <div className={`text-xs ${colorClass}`}>
      <span className="font-medium">{labels[event.type] ?? event.type}</span>
      {event.stepId && (
        <span className="text-slate-400"> · {event.stepId}</span>
      )}
      {typeof event.score === 'number' && (
        <span className="text-slate-400"> · 评分 {event.score}</span>
      )}
    </div>
  );
}
