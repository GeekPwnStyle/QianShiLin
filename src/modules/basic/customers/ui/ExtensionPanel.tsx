import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useEffect, useId, useState } from 'react';

type Item = { id: string; payload: Record<string, unknown> };
const school = ['所在学校', '所在班级', '学号'];
const allergens = ['水果', '药物', '海鲜', '环境因素'];
const past = ['做过近视治疗', '做过弱视治疗', '早产', '吸氧史', '母乳喂养', '母亲孕期用药', '母亲孕期发烧'];
const habits = ['弹琴', '拉小提琴', '古筝', '书法', '绘画', '喜欢小玩具', '喜欢手工', '看书时间长', '看电视', '玩电脑', '写字姿势不正确'];
const nutrition = ['合理膳食', '偏食挑食', '少蔬菜', '偏甜食', '高脂肪摄入过多', '偏辣'];
const degree = ['轻度', '中度', '高度'];
const titles = 'font-semibold text-[#087D70]';
const row = 'flex flex-wrap items-center gap-x-3 gap-y-2 text-sm';
const field = 'rounded-lg border border-[#D9DDD4] bg-white px-2 py-1.5 focus:border-[#087D70] focus:outline-none';

function load(payload: Record<string, unknown> = {}) {
  const result = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value ?? '')]));
  const aliases: Record<string, string> = {
    做过近视治疗: '近视治疗', 做过弱视治疗: '弱视治疗', 母亲孕期用药: '孕期用药',
    曾到医院就诊: '是否到医院诊治', 红痛史: '是否红痛', 现视力情况: '近视变化',
  };
  for (const [key, previous] of Object.entries(aliases)) {
    if (result[key] === undefined && result[previous] !== undefined) result[key] = result[previous];
  }
  const date = result['发现时间']?.match(/^(\d{4})[-/年](\d{1,2})(?:$|[-/月])/);
  if (date) {
    result['发现视力下降年份'] ??= date[1];
    result['发现视力下降月份'] ??= date[2];
  }
  if (result['红痛史'] === '是') result['红痛史'] = '有';
  if (result['红痛史'] === '否') result['红痛史'] = '无';
  return result;
}

export function ExtensionPanel({ customerId, debugMode, items, refresh }: {
  customerId: string; debugMode: boolean; items: Item[]; refresh: () => Promise<unknown>;
}) {
  const latest = items[0];
  const [draft, setDraft] = useState(() => load(latest?.payload));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const prefix = useId();
  useEffect(() => {
    setDraft(load(latest?.payload));
    setMessage('');
  }, [customerId, latest]);

  function update(key: string, value: string) {
    setDraft(previous => ({ ...previous, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (debugMode || saving) return;
    setSaving(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/customers/${customerId}/detail/extensions`, {
        method: latest ? 'PATCH' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest ? { recordId: latest.id, payload: draft } : draft),
      });
      if (!response.ok) throw new Error((await response.json()).error || '保存失败');
      await refresh();
      setMessage('拓展信息已保存');
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  const input = (key: string, className = 'w-36', numeric = false) => (
    <input aria-label={key} className={`${field} ${className}`} value={draft[key] ?? ''}
      inputMode={numeric ? 'numeric' : undefined} onChange={event => update(key, event.target.value)} />
  );
  const check = (key: string) => (
    <label key={key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <input type="checkbox" checked={['是', '有', 'true'].includes(draft[key])}
        onChange={event => update(key, event.target.checked ? '是' : '否')} />{key}
    </label>
  );
  const radios = (key: string, options: string[]) => (
    <span role="radiogroup" aria-label={key} className="inline-flex flex-wrap gap-3">
      {options.map(option => (
        <label key={option} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <input type="radio" name={prefix + key} checked={draft[key] === option}
            onChange={() => update(key, option)} />{option}
        </label>
      ))}
    </span>
  );
  const other = (section: string) => <label className="inline-flex items-center gap-2">其他{input(section + '其他')}</label>;

  return (
    <form onSubmit={save} className="space-y-5 text-sm">
      {message && <OperationStatus role={failed ? 'alert' : 'status'}>{message}</OperationStatus>}
      {saving && <OperationStatus loading>正在保存拓展信息</OperationStatus>}
      <fieldset disabled={saving || debugMode} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {school.map(label => <label key={label} className="grid gap-1"><span className={titles}>{label}</span>{input(label, 'w-full')}</label>)}
        </div>
        <fieldset>
          <legend className={titles}>现史</legend>
          <div className={row}>
            <span className="inline-flex flex-wrap items-center gap-2">从{input('发现视力下降年份', 'w-20', true)}年{input('发现视力下降月份', 'w-16', true)}月发现视力下降，</span>
            {radios('红痛史', ['有', '无'])}<span>红痛史，</span>{check('曾到医院就诊')}
            <label className="inline-flex items-center gap-2">采用方法为{input('采用方法')}</label>
            {radios('效果', ['效果好', '效果不佳'])}<span>现视力情况是：</span>{radios('现视力情况', ['无变化', '继续下降'])}
          </div>
        </fieldset>
        <fieldset>
          <legend className={titles}>既往史</legend>
          <div className={row}>
            <span className="inline-flex flex-wrap items-center gap-2">{check('过敏史')}（{allergens.map(check)}）</span>
            {past.map(check)}{other('既往史')}
          </div>
        </fieldset>
        <fieldset>
          <legend className={titles}>遗传因素</legend>
          <div className={row}>
            {check('父母均近视')}
            <span>父亲近视（{radios('父亲近视程度', degree)}）</span>
            <span>母亲近视（{radios('母亲近视程度', degree)}）</span>
            {['家族无弱视患者', '父亲弱视', '母亲弱视'].map(check)}{other('遗传因素')}
          </div>
        </fieldset>
        <fieldset>
          <legend className={titles}>环境行为因素</legend>
          <div className={row}>
            {habits.map(check)}{other('环境行为因素')}
            <label className="inline-flex items-center gap-2">平均每天看近用眼量{input('平均每天看近用眼量')}</label>
          </div>
        </fieldset>
        <fieldset>
          <legend className={titles}>营养因素</legend>
          <div className={row}>{nutrition.map(check)}{other('营养因素')}</div>
        </fieldset>
        <label className="grid gap-1"><span className={titles}>备注</span>
          <textarea className={`${field} min-h-20 w-full`} value={draft['备注'] ?? ''} onChange={event => update('备注', event.target.value)} />
        </label>
      </fieldset>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || debugMode} className="rounded-xl bg-[var(--qsl-accent)] px-5 py-2 font-semibold disabled:opacity-40">保存</button>
      </div>
    </form>
  );
}
