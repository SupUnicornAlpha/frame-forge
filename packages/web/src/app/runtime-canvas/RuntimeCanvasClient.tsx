'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Task, type TaskDetail } from '@/lib/api';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'unknown';
type TopologyNodeId =
  | 'trend-collection'
  | 'script-writing'
  | 'script-critic'
  | 'storyboard-generation'
  | 'video-generation'
  | 'final-evaluation';

interface TopologyNodeDef {
  id: TopologyNodeId;
  label: string;
  hint: string;
  x: number;
  y: number;
}

interface StatusTone {
  pill: string;
  soft: string;
  text: string;
  stroke: string;
}

const TASK_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  running: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
};

const STEP_STATUS_STYLE: Record<StepStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  unknown: 'bg-zinc-100 text-zinc-700',
};

const TOPOLOGY: TopologyNodeDef[] = [
  { id: 'trend-collection', label: '热点采集', hint: 'trend-scout', x: 40, y: 100 },
  { id: 'script-writing', label: '剧本编写', hint: 'screenwriter', x: 280, y: 100 },
  { id: 'script-critic', label: '剧本评测反馈', hint: 'critic loop', x: 280, y: 250 },
  { id: 'storyboard-generation', label: '分镜生成', hint: 'storyboard', x: 520, y: 100 },
  { id: 'video-generation', label: '视频生成', hint: 'video-director', x: 760, y: 100 },
  { id: 'final-evaluation', label: '终评', hint: 'audience', x: 1000, y: 100 },
];

const TOPOLOGY_EDGES: Array<{ from: TopologyNodeId; to: TopologyNodeId; label?: string }> = [
  { from: 'trend-collection', to: 'script-writing' },
  { from: 'script-writing', to: 'storyboard-generation' },
  { from: 'storyboard-generation', to: 'video-generation' },
  { from: 'video-generation', to: 'final-evaluation' },
  { from: 'script-writing', to: 'script-critic', label: '评测' },
  { from: 'script-critic', to: 'script-writing', label: '反馈' },
];

function normalizeStepStatus(status: string): StepStatus {
  if (status === 'pending' || status === 'running' || status === 'completed' || status === 'failed') {
    return status;
  }
  return 'unknown';
}

function formatStepTitle(step: TaskDetail['steps'][number]): string {
  return step.agentRole ? `${step.stepId} · ${step.agentRole}` : step.stepId;
}

function mapTaskDetailToTopology(
  detail?: TaskDetail
): Record<TopologyNodeId, { status: StepStatus; iterations?: number | undefined }> {
  const byId = new Map((detail?.steps ?? []).map((s) => [s.stepId, s]));

  const trend = byId.get('trend-collection');
  const script = byId.get('script-writing');
  const storyboard = byId.get('storyboard-generation');
  const video = byId.get('video-generation');
  const finalEval = byId.get('final-evaluation');

  const scriptStatus = normalizeStepStatus(script?.status ?? 'pending');
  const scriptIterations = typeof script?.iterations === 'number' ? script.iterations : undefined;
  const criticStatus: StepStatus =
    scriptIterations && scriptIterations > 1
      ? scriptStatus === 'failed'
        ? 'failed'
        : scriptStatus === 'completed'
          ? 'completed'
          : 'running'
      : scriptStatus === 'failed'
        ? 'failed'
        : scriptStatus === 'running'
          ? 'running'
          : 'pending';

  return {
    'trend-collection': {
      status: normalizeStepStatus(trend?.status ?? 'pending'),
      iterations: trend?.iterations ?? undefined,
    },
    'script-writing': {
      status: scriptStatus,
      iterations: scriptIterations,
    },
    'script-critic': {
      status: criticStatus,
      iterations: scriptIterations,
    },
    'storyboard-generation': {
      status: normalizeStepStatus(storyboard?.status ?? 'pending'),
      iterations: storyboard?.iterations ?? undefined,
    },
    'video-generation': {
      status: normalizeStepStatus(video?.status ?? 'pending'),
      iterations: video?.iterations ?? undefined,
    },
    'final-evaluation': {
      status: normalizeStepStatus(finalEval?.status ?? 'pending'),
      iterations: finalEval?.iterations ?? undefined,
    },
  };
}

function statusScore(status: StepStatus): number {
  if (status === 'failed') return 4;
  if (status === 'running') return 3;
  if (status === 'completed') return 2;
  if (status === 'pending') return 1;
  return 0;
}

function edgeClassByStatus(from: StepStatus, to: StepStatus): string {
  const s = Math.max(statusScore(from), statusScore(to));
  if (s >= 4) return 'stroke-rose-400';
  if (s >= 3) return 'stroke-blue-400';
  if (s >= 2) return 'stroke-emerald-400';
  return 'stroke-slate-300';
}

function toneByStatus(status: StepStatus): StatusTone {
  if (status === 'running') {
    return {
      pill: 'bg-blue-100 text-blue-700 border border-blue-200',
      soft: 'bg-blue-50',
      text: 'text-blue-700',
      stroke: 'stroke-blue-400',
    };
  }
  if (status === 'completed') {
    return {
      pill: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      soft: 'bg-emerald-50',
      text: 'text-emerald-700',
      stroke: 'stroke-emerald-400',
    };
  }
  if (status === 'failed') {
    return {
      pill: 'bg-rose-100 text-rose-700 border border-rose-200',
      soft: 'bg-rose-50',
      text: 'text-rose-700',
      stroke: 'stroke-rose-400',
    };
  }
  if (status === 'unknown') {
    return {
      pill: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
      soft: 'bg-zinc-50',
      text: 'text-zinc-700',
      stroke: 'stroke-zinc-400',
    };
  }
  return {
    pill: 'bg-slate-100 text-slate-700 border border-slate-200',
    soft: 'bg-slate-50',
    text: 'text-slate-700',
    stroke: 'stroke-slate-300',
  };
}

export default function RuntimeCanvasClient({
  focusTaskId,
}: {
  focusTaskId?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [detailsMap, setDetailsMap] = useState<Record<string, TaskDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [selectedNodeByTask, setSelectedNodeByTask] = useState<Record<string, TopologyNodeId>>({});

  const load = useCallback(async () => {
    try {
      const list = await api.tasks.list();
      const details = await Promise.all(
        list.map(async (task) => {
          try {
            return await api.tasks.get(task.id);
          } catch {
            return null;
          }
        })
      );

      const nextMap: Record<string, TaskDetail> = {};
      for (const detail of details) {
        if (detail) nextMap[detail.id] = detail;
      }

      const filtered = focusTaskId ? list.filter((t) => t.id === focusTaskId) : list;
      setTasks(filtered);
      setDetailsMap(nextMap);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError((err as Error).message || '拉取运行状态失败');
    } finally {
      setLoading(false);
    }
  }, [focusTaskId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  const totalRunningSteps = useMemo(() => {
    return Object.values(detailsMap).reduce((acc, detail) => {
      const running = detail.steps.filter((s) => normalizeStepStatus(s.status) === 'running').length;
      return acc + running;
    }, 0);
  }, [detailsMap]);

  const totalFailedSteps = useMemo(() => {
    return Object.values(detailsMap).reduce((acc, detail) => {
      const failed = detail.steps.filter((s) => normalizeStepStatus(s.status) === 'failed').length;
      return acc + failed;
    }, 0);
  }, [detailsMap]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="ff-panel p-5 flex flex-wrap items-start justify-between gap-4 relative overflow-hidden">
        <div className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-pink-300/25 blur-2xl" />
        <div className="absolute -bottom-20 left-10 w-52 h-52 rounded-full bg-violet-300/20 blur-2xl" />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-pink-500 font-semibold">Frame Forge Studio</p>
          <h1 className="text-2xl font-bold mt-1 ff-ig-text">{focusTaskId ? '任务运行画布' : '运行画布'}</h1>
          <p className="text-sm text-slate-500 mt-2">
            {focusTaskId
              ? '监控当前任务中每个节点的运行状态（自动刷新：3s）'
              : '监控所有任务中每个节点的运行状态（自动刷新：3s）'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="ff-ig-chip">运行中节点 {totalRunningSteps}</span>
          <span className="ff-ig-chip">失败节点 {totalFailedSteps}</span>
          <span className="px-2.5 py-1 rounded-full border border-white/70 bg-white/70 text-slate-700 backdrop-blur">
            {lastUpdatedAt ? `最近刷新 ${lastUpdatedAt.toLocaleTimeString('zh-CN')}` : '首次加载中'}
          </span>
        </div>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">正在加载运行数据...</div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          拉取数据失败：{error}
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="text-4xl mb-3">🧩</div>
          <p className="text-sm text-slate-500">当前还没有任务，先去创建任务即可在这里看到节点运行状态。</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const detail = detailsMap[task.id];
            const taskClass = TASK_STATUS_STYLE[task.status] ?? TASK_STATUS_STYLE.pending;
            const steps = detail?.steps ?? [];
            const topologyState = mapTaskDetailToTopology(detail);
            const selectedNode = selectedNodeByTask[task.id] ?? 'script-writing';
            const selectedState = topologyState[selectedNode];
            const relatedSteps = steps.filter((s) => {
              if (selectedNode === 'script-critic') return s.stepId === 'script-writing';
              return s.stepId === selectedNode;
            });

            return (
              <section key={task.id} className="ff-panel p-4 sm:p-5 hover:shadow-xl hover:shadow-fuchsia-200/40 transition-shadow duration-300">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{task.name}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Task ID: {task.id} · 更新于 {new Date(task.updatedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${taskClass}`}>{task.status}</span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-3">
                    子任务拓扑：热点采集 → 剧本编写 ⇄ 剧本评测反馈 → 分镜生成 → 视频生成 → 终评
                  </p>
                  <div className="overflow-x-auto">
                    <div className="min-w-[1160px] rounded-xl border border-white/70 bg-gradient-to-b from-white/80 via-fuchsia-50/40 to-violet-50/30 p-2">
                      <svg viewBox="0 0 1160 360" className="w-full h-[300px]">
                        <defs>
                          <marker
                            id={`arrow-${task.id}`}
                            markerWidth="8"
                            markerHeight="8"
                            refX="7"
                            refY="4"
                            orient="auto"
                            markerUnits="strokeWidth"
                          >
                            <path d="M0,0 L8,4 L0,8 z" className="fill-current text-slate-400" />
                          </marker>
                        </defs>

                        {TOPOLOGY_EDGES.map((edge) => {
                          const fromNode = TOPOLOGY.find((n) => n.id === edge.from)!;
                          const toNode = TOPOLOGY.find((n) => n.id === edge.to)!;
                          const strokeClass = edgeClassByStatus(
                            topologyState[edge.from].status,
                            topologyState[edge.to].status
                          );
                          const maxStatusScore = Math.max(
                            statusScore(topologyState[edge.from].status),
                            statusScore(topologyState[edge.to].status)
                          );

                          const x1 = fromNode.x + 160;
                          const y1 = fromNode.y + 34;
                          const x2 = toNode.x;
                          const y2 = toNode.y + 34;
                          const isFeedback = edge.from === 'script-critic' && edge.to === 'script-writing';
                          const path = isFeedback
                            ? `M ${x1} ${y1} C ${x1 + 70} ${y1 + 40}, ${x2 - 70} ${y2 + 40}, ${x2} ${y2}`
                            : `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`;

                          return (
                            <g key={`${edge.from}-${edge.to}`}>
                              <path d={path} className={`${strokeClass} fill-none stroke-[2.2]`} markerEnd={`url(#arrow-${task.id})`} />
                              {maxStatusScore >= 3 ? (
                                <path
                                  d={path}
                                  className={`${strokeClass} fill-none stroke-[2.2] ff-edge-flow opacity-80`}
                                  markerEnd={`url(#arrow-${task.id})`}
                                />
                              ) : null}
                              {edge.label ? (
                                <text
                                  x={(x1 + x2) / 2}
                                  y={isFeedback ? y1 + 40 : y1 - 8}
                                  textAnchor="middle"
                                  className="fill-slate-500 text-[11px]"
                                >
                                  {edge.label}
                                </text>
                              ) : null}
                            </g>
                          );
                        })}

                        {TOPOLOGY.map((node) => {
                          const state = topologyState[node.id];
                          const isSelected = selectedNode === node.id;
                          const statusCls = STEP_STATUS_STYLE[state.status];
                          const tone = toneByStatus(state.status);
                          const running = state.status === 'running';
                          const failed = state.status === 'failed';
                          return (
                            <g
                              key={node.id}
                              transform={`translate(${node.x}, ${node.y})`}
                              className="cursor-pointer"
                              onClick={() =>
                                setSelectedNodeByTask((prev) => ({ ...prev, [task.id]: node.id }))
                              }
                            >
                              <rect
                                x="0"
                                y="0"
                                rx="10"
                                ry="10"
                                width="160"
                                height="68"
                                className={`${isSelected ? 'stroke-indigo-500 stroke-2' : tone.stroke + ' stroke-1'} ${tone.soft} ${running ? 'animate-ff-breathe' : ''}`}
                              />
                              <text x="10" y="22" className="fill-slate-900 text-[13px] font-semibold">
                                {node.label}
                              </text>
                              <text x="10" y="38" className="fill-slate-500 text-[11px]">
                                {node.hint}
                              </text>
                              <text x="10" y="56" className="fill-slate-700 text-[11px]">
                                {state.status}
                                {typeof state.iterations === 'number' ? ` · 迭代 ${state.iterations}` : ''}
                              </text>
                              {failed ? <circle cx="144" cy="12" r="5" className="fill-rose-500 ff-danger-blink" /> : null}
                              {running ? <circle cx="144" cy="12" r="5" className="fill-blue-500 animate-ff-breathe" /> : null}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/70 bg-white/80 backdrop-blur p-3">
                    <p className="text-xs font-medium text-slate-700 mb-2">
                      节点详情：{TOPOLOGY.find((n) => n.id === selectedNode)?.label}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                      <span className={`px-2 py-1 rounded-md ${toneByStatus(selectedState.status).pill}`}>
                        状态：{selectedState.status}
                      </span>
                      {typeof selectedState.iterations === 'number' ? (
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                          迭代：{selectedState.iterations}
                        </span>
                      ) : null}
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                        原始 step 条数：{relatedSteps.length}
                      </span>
                    </div>

                    {relatedSteps.length > 0 ? (
                      <div className="grid gap-2">
                        {relatedSteps.map((step) => (
                          <div key={step.id} className="rounded-lg border border-white/70 bg-white/70 p-2 text-xs">
                            <div className="font-medium text-slate-700">
                              {step.stepId} · {step.agentRole}
                            </div>
                            <div className="text-slate-500 mt-1">
                              {step.status}
                              {typeof step.iterations === 'number' ? ` · 迭代 ${step.iterations}` : ''}
                              {step.startedAt ? ` · 开始 ${new Date(step.startedAt).toLocaleString('zh-CN')}` : ''}
                              {step.completedAt
                                ? ` · 结束 ${new Date(step.completedAt).toLocaleString('zh-CN')}`
                                : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">这个节点还没有落库的 step 记录。</p>
                    )}
                  </div>

                  <div className="mt-4">
                    {steps.length === 0 ? (
                      <p className="text-xs text-slate-400">该任务暂未写入实际 step 记录，当前状态按拓扑默认值展示。</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {steps.map((step) => {
                          const stepStatus = normalizeStepStatus(step.status);
                          const stepClass = toneByStatus(stepStatus).pill;
                          return (
                            <div key={step.id} className={`px-2.5 py-1.5 rounded-lg text-xs ${stepClass} ${stepStatus === 'running' ? 'ff-glow-running' : ''} backdrop-blur`}>
                              <div className="font-medium">{formatStepTitle(step)}</div>
                              <div className="opacity-80 mt-0.5">
                                {stepStatus}
                                {typeof step.iterations === 'number' ? ` · 迭代 ${step.iterations}` : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

