'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const GENRE_OPTIONS = [
  { value: 'romance', label: '爱情' },
  { value: 'comedy', label: '喜剧' },
  { value: 'thriller', label: '悬疑' },
  { value: 'family', label: '家庭' },
  { value: 'fantasy', label: '奇幻' },
  { value: 'drama', label: '剧情' },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    genre: 'romance',
    manualTheme: '',
    targetDuration: 60,
    episodeCount: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const task = await api.tasks.create({
        name: form.name || `短剧任务 ${new Date().toLocaleDateString('zh-CN')}`,
        config: {
          genre: form.genre,
          manualTheme: form.manualTheme || undefined,
          targetDuration: form.targetDuration,
          episodeCount: form.episodeCount,
        },
      });
      router.push(`/tasks/${task.id}`);
    } catch (err) {
      alert(`创建失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">新建生产任务</h1>
        <p className="text-sm text-slate-500 mt-1">配置短剧 AI 生产参数，启动全流程自动化生产</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">任务名称</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例如：甜宠短剧 Vol.1"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">剧情类型</label>
          <div className="grid grid-cols-3 gap-2">
            {GENRE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, genre: opt.value })}
                className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
                  form.genre === opt.value
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            指定主题 <span className="text-slate-400 font-normal">（可选，留空则自动收集热点）</span>
          </label>
          <input
            type="text"
            value={form.manualTheme}
            onChange={(e) => setForm({ ...form, manualTheme: e.target.value })}
            placeholder="例如：职场逆袭、霸总追妻、穿越古代..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">每集时长（秒）</label>
            <input
              type="number"
              min={30}
              max={300}
              value={form.targetDuration}
              onChange={(e) => setForm({ ...form, targetDuration: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">集数</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.episodeCount}
              onChange={(e) => setForm({ ...form, episodeCount: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors"
            />
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '创建中...' : '开始生产'}
          </button>
        </div>
      </form>

      <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <p className="text-xs text-amber-700">
          <strong>提示：</strong>确保已在"供应商"页面配置了 LLM API Key。任务启动后将自动进行：
          热点收集 → 剧本编写（含评审迭代）→ 分镜生成 → 视频生成 → 综合评价。
        </p>
      </div>
    </div>
  );
}
