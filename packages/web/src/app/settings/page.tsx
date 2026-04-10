'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const PROVIDER_FIELDS = [
  { key: 'openai', label: 'OpenAI Token' },
  { key: 'anthropic', label: 'Anthropic Token' },
  { key: 'gemini', label: 'Gemini Token' },
  { key: 'deepseek', label: 'DeepSeek Token' },
  { key: 'qwen', label: 'Qwen Token' },
  { key: 'glm', label: 'GLM Token' },
  { key: 'kimi', label: 'Kimi Token' },
];

export default function SettingsPage() {
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [maskedTokens, setMaskedTokens] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.settings.listProviderSecrets();
        const nextMasked: Record<string, string> = {};
        for (const p of res.providers) {
          nextMasked[p.providerId] = p.maskedToken;
        }
        setMaskedTokens(nextMasked);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const configuredCount = useMemo(
    () => PROVIDER_FIELDS.filter((f) => Boolean(maskedTokens[f.key])).length,
    [maskedTokens]
  );

  const updateToken = (key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (providerId: string) => {
    const token = tokens[providerId]?.trim();
    if (!token) return;
    setSavingKey(providerId);
    setError('');
    try {
      await api.settings.upsertProviderSecret({ providerId, token });
      const res = await api.settings.listProviderSecrets();
      const nextMasked: Record<string, string> = {};
      for (const p of res.providers) nextMasked[p.providerId] = p.maskedToken;
      setMaskedTokens(nextMasked);
      setTokens((prev) => ({ ...prev, [providerId]: '' }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingKey('');
    }
    setSavedAt(new Date().toLocaleString('zh-CN'));
  };

  const remove = async (providerId: string) => {
    setSavingKey(providerId);
    setError('');
    try {
      await api.settings.deleteProviderSecret(providerId);
      setMaskedTokens((prev) => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">设置</h1>
        <p className="text-sm text-slate-500 mt-1">配置供应商 Token（服务端加密托管）</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">供应商 Token</h2>
          <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700">
            已配置 {configuredCount} / {PROVIDER_FIELDS.length}
          </span>
        </div>
        {loading ? <p className="text-xs text-slate-500 mb-3">读取配置中...</p> : null}
        {error ? <p className="text-xs text-rose-600 mb-3">错误：{error}</p> : null}
        <div className="grid gap-3">
          {PROVIDER_FIELDS.map((field) => (
            <div key={field.key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-slate-700">{field.label}</label>
                <span className="text-xs text-slate-400">{field.key}</span>
              </div>
              <input
                type="password"
                value={tokens[field.key] ?? ''}
                onChange={(e) => updateToken(field.key, e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder={`输入 ${field.key} token`}
              />
              {maskedTokens[field.key] ? <p className="text-xs text-slate-400 mt-1">当前：{maskedTokens[field.key]}</p> : null}
              <div className="mt-2">
                <button
                  onClick={() => void save(field.key)}
                  disabled={!tokens[field.key]?.trim() || savingKey === field.key}
                  className="px-3 py-1.5 text-xs rounded-md bg-purple-600 text-white disabled:opacity-50"
                >
                  {savingKey === field.key ? '保存中...' : '保存到服务端'}
                </button>
                <button
                  onClick={() => void remove(field.key)}
                  disabled={!maskedTokens[field.key] || savingKey === field.key}
                  className="ml-2 px-3 py-1.5 text-xs rounded-md bg-slate-200 text-slate-700 disabled:opacity-50"
                >
                  删除服务端配置
                </button>
              </div>
            </div>
          ))}
        </div>
        {savedAt ? <div className="mt-4 text-xs text-slate-500">最近保存：{savedAt}</div> : null}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        说明：Token 已改为服务端加密存储。调用聊天接口时后端将按租户与供应商读取 token，不再需要前端直传密钥。
      </div>
    </div>
  );
}

