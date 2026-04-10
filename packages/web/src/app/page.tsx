import Link from 'next/link';
import { api, type Task } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let tasks: Task[] = [];
  try {
    tasks = await api.tasks.list();
  } catch {
    tasks = [];
  }

  const running = tasks.filter((t) => t.status === 'running').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const failed = tasks.filter((t) => t.status === 'failed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">首页仪表盘</h1>
          <p className="text-sm text-slate-500 mt-1">查看任务概况、快速进入任务和配置页</p>
        </div>
        <Link
          href="/tasks/new"
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          + 新建任务
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="任务总数" value={tasks.length} tone="slate" />
        <StatCard title="运行中" value={running} tone="blue" />
        <StatCard title="已完成" value={completed} tone="green" />
        <StatCard title="失败" value={failed} tone="red" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">最近任务</h2>
          <Link href="/tasks" className="text-sm text-purple-600 hover:underline">
            查看全部
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">暂无任务，先创建一个任务吧。</p>
        ) : (
          <div className="grid gap-2">
            {[...tasks].reverse().slice(0, 6).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{task.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(task.updatedAt).toLocaleString('zh-CN')}</p>
                </div>
                <span className="text-xs text-slate-500">{task.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: 'slate' | 'blue' | 'green' | 'red';
}) {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-50 text-blue-700 border-blue-100'
      : tone === 'green'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : tone === 'red'
          ? 'bg-rose-50 text-rose-700 border-rose-100'
          : 'bg-slate-50 text-slate-700 border-slate-100';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs opacity-80">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
