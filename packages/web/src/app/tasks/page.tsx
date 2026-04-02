import Link from 'next/link';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

const STATUS_CONFIG = {
  pending: { label: '待处理', className: 'bg-slate-100 text-slate-700' },
  running: { label: '运行中', className: 'bg-blue-100 text-blue-700' },
  paused: { label: '已暂停', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  failed: { label: '失败', className: 'bg-red-100 text-red-700' },
} as const;

export default async function TasksPage() {
  let tasks = [];
  try {
    tasks = await api.tasks.list();
  } catch {
    // API might not be running in dev
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">生产任务</h1>
          <p className="text-sm text-slate-500 mt-1">管理短剧 AI 生产流水线任务</p>
        </div>
        <Link
          href="/tasks/new"
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          + 新建任务
        </Link>
      </div>

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: { id: string; name: string; status: keyof typeof STATUS_CONFIG; updatedAt: string } }) {
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-purple-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <span className="text-lg">🎬</span>
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{task.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              更新于 {new Date(task.updatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.className}`}>
          {task.status === 'running' && (
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mr-1" />
          )}
          {statusCfg.label}
        </span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="text-4xl mb-4">🎬</div>
      <h3 className="text-base font-semibold text-slate-700">暂无任务</h3>
      <p className="text-sm text-slate-400 mt-1 mb-6">创建第一个短剧 AI 生产任务开始体验</p>
      <Link
        href="/tasks/new"
        className="inline-block px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
      >
        新建任务
      </Link>
    </div>
  );
}
