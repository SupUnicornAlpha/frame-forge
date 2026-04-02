import { api } from '@/lib/api';
import { TaskDetailClient } from './TaskDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: Props) {
  const { id } = await params;

  let task = null;
  try {
    task = await api.tasks.get(id);
  } catch {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">任务不存在或 API 未启动</p>
      </div>
    );
  }

  return <TaskDetailClient initialTask={task} />;
}
