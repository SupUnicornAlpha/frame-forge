import { api } from '@/lib/api';
import TaskCanvasStudioClient from './TaskCanvasStudioClient';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function TaskCanvasPage({ params }: Props) {
  const { id } = await params;
  try {
    const task = await api.tasks.get(id);
    return <TaskCanvasStudioClient initialTask={task} />;
  } catch {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">任务不存在或 API 未启动</p>
      </div>
    );
  }
}

