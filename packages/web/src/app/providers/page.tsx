export default function ProvidersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">供应商配置</h1>
        <p className="text-sm text-slate-500 mt-1">配置 LLM 和媒体生成服务</p>
      </div>

      <div className="grid gap-4">
        <ProviderSection
          title="LLM 供应商"
          description="用于剧本编写、评审等文本生成任务"
          providers={[
            { id: 'openai', name: 'OpenAI', models: 'GPT-4o, o1', envKey: 'OPENAI_API_KEY' },
            { id: 'anthropic', name: 'Anthropic', models: 'Claude 3.5 Sonnet/Haiku', envKey: 'ANTHROPIC_API_KEY' },
            { id: 'gemini', name: 'Google Gemini', models: 'Gemini 2.0 Flash/Pro', envKey: 'GEMINI_API_KEY' },
          ]}
        />

        <ProviderSection
          title="图像生成供应商"
          description="用于分镜图生成"
          providers={[
            { id: 'sdxl', name: 'Stable Diffusion XL', models: 'SDXL 1.0', envKey: 'SDXL_API_KEY' },
            { id: 'flux', name: 'FLUX', models: 'FLUX.1-dev', envKey: 'FLUX_API_KEY' },
          ]}
        />

        <ProviderSection
          title="视频生成供应商"
          description="用于短片段视频生成"
          providers={[
            { id: 'seedance', name: 'Seedance（字节）', models: 'Seedance 1.0', envKey: 'SEEDANCE_API_KEY' },
            { id: 'kling', name: '可灵（快手）', models: 'Kling 1.6', envKey: 'KLING_API_KEY' },
            { id: 'sora', name: 'Sora（OpenAI）', models: 'Sora', envKey: 'OPENAI_API_KEY' },
          ]}
        />
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-xs text-slate-500">
          <strong>配置方式：</strong>在项目根目录创建 <code className="bg-white px-1 py-0.5 rounded border border-slate-200">.env</code> 文件，
          按上方的环境变量名填入对应的 API Key。
        </p>
      </div>
    </div>
  );
}

function ProviderSection({
  title,
  description,
  providers,
}: {
  title: string;
  description: string;
  providers: Array<{ id: string; name: string; models: string; envKey: string }>;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <p className="text-xs text-slate-400 mt-0.5 mb-4">{description}</p>
      <div className="space-y-2">
        {providers.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-slate-800">{p.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{p.models}</p>
            </div>
            <code className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg font-mono text-slate-600">
              {p.envKey}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}
