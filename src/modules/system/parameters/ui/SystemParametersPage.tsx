import { SessionPolicySettings } from './SessionPolicySettings';
import { defaultFontSizes, fontAreas, useFontSizes } from '../domain/displayFontSizes';
import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  CopyCheck,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Store,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  DEFAULT_SYSTEM_PARAMETERS,
  PARAMETER_SECTIONS,
  getStoreParameters,
  saveStoreParameters,
  syncParametersToOtherStores,
  type ParameterFieldDef,
  type SystemParameterKey,
  type SystemParametersConfig,
} from '@/src/modules/system/parameters/domain/systemParameters';
import { loadStoreProfiles } from '@/src/modules/system/stores/domain/storeProfile';
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import { Select } from '@/src/shared/ui/Select';
import { EmptyState } from '@/src/shared/ui/StateViews';

function countDiffKeys(
  a: SystemParametersConfig,
  b: SystemParametersConfig
): SystemParameterKey[] {
  const keys = Object.keys(DEFAULT_SYSTEM_PARAMETERS) as SystemParameterKey[];
  return keys.filter((k) => a[k] !== b[k]);
}

function generateRandomAuthCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function extendExpiryByYears(current: string, years: number): string {
  const normalized = current.trim().replace(' ', 'T');
  const parsed = new Date(normalized);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  base.setFullYear(base.getFullYear() + years);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  const hh = String(base.getHours()).padStart(2, '0');
  const mm = String(base.getMinutes()).padStart(2, '0');
  const ss = String(base.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export const SystemParametersPage: React.FC = () => {
  const { session } = useAuth();
  const { sizes: fontSizes, save: saveFonts } = useFontSizes();
  const stores = useMemo(() => loadStoreProfiles(), []);

  const initialStoreId = useMemo(() => {
    if (
      session.currentStoreId &&
      session.currentStoreId !== 'all' &&
      stores.some((s) => s.id === session.currentStoreId)
    ) {
      return session.currentStoreId;
    }
    return stores[0]?.id ?? 'store_hq_01';
  }, [session.currentStoreId, stores]);

  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStoreId);
  const [savedConfig, setSavedConfig] = useState<SystemParametersConfig>(() =>
    getStoreParameters(initialStoreId)
  );
  const [draftConfig, setDraftConfig] = useState<SystemParametersConfig>(() =>
    getStoreParameters(initialStoreId)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyModified, setOnlyModified] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>(PARAMETER_SECTIONS[0].id);
  const [noticeText, setNoticeText] = useState<string | null>(null);

  // Modals
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncTargetIds, setSyncTargetIds] = useState<string[]>([]);
  const [syncScope, setSyncScope] = useState<'all' | 'changed'>('all');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const next = getStoreParameters(selectedStoreId);
    setSavedConfig(next);
    setDraftConfig(next);
  }, [selectedStoreId]);

  useEffect(() => {
    if (!noticeText) return;
    const t = window.setTimeout(() => setNoticeText(null), 3200);
    return () => window.clearTimeout(t);
  }, [noticeText]);

  const unsavedKeys = useMemo(
    () => countDiffKeys(draftConfig, savedConfig),
    [draftConfig, savedConfig]
  );

  const unsavedKeySet = useMemo(() => new Set(unsavedKeys), [unsavedKeys]);

  const selectedStoreName = useMemo(
    () => stores.find((s) => s.id === selectedStoreId)?.name ?? '默认门店',
    [stores, selectedStoreId]
  );

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PARAMETER_SECTIONS.map((sec) => {
      const fields = sec.fields.filter((f) => {
        if (onlyModified && !unsavedKeySet.has(f.key)) return false;
        if (!q) return true;
        return (
          f.label.toLowerCase().includes(q) ||
          f.helpText.toLowerCase().includes(q) ||
          sec.title.toLowerCase().includes(q)
        );
      });
      return { ...sec, fields };
    }).filter((sec) => sec.fields.length > 0);
  }, [searchQuery, onlyModified, unsavedKeySet]);

  // Keep active anchor synchronized with visible sections
  useEffect(() => {
    if (filteredSections.length === 0) return;
    if (!filteredSections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(filteredSections[0].id);
    }
  }, [filteredSections, activeSectionId]);

  useEffect(() => {
    if (typeof window === 'undefined' || filteredSections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-section-id');
          if (id) setActiveSectionId(id);
        }
      },
      {
        rootMargin: '-110px 0px -65% 0px',
        threshold: [0, 0.2],
      }
    );

    for (const sec of filteredSections) {
      const el = sectionRefs.current[sec.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [filteredSections]);

  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const updateField = <K extends SystemParameterKey>(
    key: K,
    value: SystemParametersConfig[K]
  ) => {
    setDraftConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveStoreParameters(selectedStoreId, draftConfig);
    setSavedConfig(draftConfig);
    setNoticeText(`已保存「${selectedStoreName}」的 ${Object.keys(DEFAULT_SYSTEM_PARAMETERS).length} 项系统参数配置（本地前端状态）`);
  };

  const handleOpenSyncModal = () => {
    const otherIds = stores.filter((s) => s.id !== selectedStoreId).map((s) => s.id);
    setSyncTargetIds(otherIds);
    setSyncScope(unsavedKeys.length > 0 ? 'changed' : 'all');
    setSyncModalOpen(true);
  };

  const handleConfirmSync = () => {
    if (syncTargetIds.length === 0) return;
    // Save current store first so source & targets stay consistent
    saveStoreParameters(selectedStoreId, draftConfig);
    setSavedConfig(draftConfig);
    syncParametersToOtherStores(
      draftConfig,
      syncTargetIds,
      syncScope === 'changed' && unsavedKeys.length > 0 ? unsavedKeys : undefined
    );
    setSyncModalOpen(false);
    setNoticeText(
      `已将${syncScope === 'changed' && unsavedKeys.length > 0 ? `本次调整的 ${unsavedKeys.length} 项参数` : '全部系统参数'}同步至 ${syncTargetIds.length} 家其他门店`
    );
  };

  const handleConfirmReset = () => {
    setDraftConfig({ ...DEFAULT_SYSTEM_PARAMETERS });
    setResetModalOpen(false);
    setNoticeText(`已将「${selectedStoreName}」参数恢复为系统默认推荐值，点击「保存设置」即可生效`);
  };

  const handleOpenPhoneModal = () => {
    setPhoneInput(draftConfig.salesRefundAdminPhone);
    setPhoneError(null);
    setPhoneModalOpen(true);
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phoneInput.trim();
    if (trimmed && !/^1\d{10}$/.test(trimmed)) {
      setPhoneError('请输入正确的 11 位大陆手机号码');
      return;
    }
    updateField('salesRefundAdminPhone', trimmed);
    setPhoneModalOpen(false);
    setNoticeText('已更新销售退款管理员手机，请记得点击右上角「保存设置」');
  };

  const renderChoiceField = (field: ParameterFieldDef) => {
    const currentValue = String(draftConfig[field.key]);
    const isModified = unsavedKeySet.has(field.key);
    const options = field.options ?? [];

    return (
      <div
        key={field.key}
        className="pb-4 border-b border-[#EEF0EA] flex flex-col justify-between gap-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[14px] font-medium text-[#171916] leading-snug">
              {field.label}
            </span>
            <HelpTooltip content={field.helpText} ariaLabel={`查看${field.label}说明`} />
          </div>
          {isModified && (
            <span className="text-[12px] font-medium text-[var(--qsl-accent-soft-ink)] shrink-0 whitespace-nowrap">
              已修改
            </span>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label={field.label}
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F3F5F0] border border-[#E5E8E0] self-start max-w-full"
        >
          {options.map((opt) => {
            const active = currentValue === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() =>
                  updateField(
                    field.key,
                    opt.value as SystemParametersConfig[typeof field.key]
                  )
                }
                className={`min-h-[32px] px-3 py-1 rounded-lg text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#171916] text-white font-medium shadow-xs'
                    : 'text-[#5F645D] hover:text-[#171916] hover:bg-white/70'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderNumberField = (field: ParameterFieldDef) => {
    const value = Number(draftConfig[field.key]);
    const isModified = unsavedKeySet.has(field.key);

    return (
      <div key={field.key} className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <label
              htmlFor={`param-${field.key}`}
              className="text-[14px] font-medium text-[#171916] truncate"
              title={field.label}
            >
              {field.label}
            </label>
            <HelpTooltip content={field.helpText} ariaLabel={`查看${field.label}说明`} />
          </div>
          {isModified && (
            <span className="text-[12px] font-medium text-[var(--qsl-accent-soft-ink)] shrink-0">已修改</span>
          )}
        </div>
        <div className="relative flex items-center">
          <input
            id={`param-${field.key}`}
            type="number"
            min={field.min ?? 0}
            max={field.max ?? 9999}
            value={Number.isNaN(value) ? 0 : value}
            onChange={(e) => {
              const raw = Number(e.target.value);
              const clamped = Math.max(
                field.min ?? 0,
                Math.min(field.max ?? 9999, Number.isNaN(raw) ? 0 : raw)
              );
              updateField(field.key, clamped as SystemParametersConfig[typeof field.key]);
            }}
            className={`w-full h-10 pl-3.5 pr-10 rounded-xl border bg-[#FAFBF8] text-[14px] font-medium text-[#171916] tabular-nums outline-none transition-colors focus:bg-white focus:border-[#171916] ${
              isModified ? 'border-[var(--qsl-accent-border)]' : 'border-[#D9DDD4]'
            }`}
          />
          {field.unit && (
            <span className="absolute right-3.5 text-[13px] text-[#73796F] pointer-events-none">
              {field.unit}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderAdminSectionFields = (fields: ParameterFieldDef[]) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
      {fields.map((field) => {
        const isModified = unsavedKeySet.has(field.key);
        if (field.kind === 'authCode') {
          return (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="param-adminAuthCode"
                    className="text-[14px] font-medium text-[#171916]"
                  >
                    {field.label}
                  </label>
                  <HelpTooltip content={field.helpText} ariaLabel="查看授权码说明" />
                </div>
                {isModified && (
                  <span className="text-[12px] font-medium text-[var(--qsl-accent-soft-ink)]">已修改</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <input
                    id="param-adminAuthCode"
                    type="text"
                    value={draftConfig.adminAuthCode}
                    onChange={(e) => updateField('adminAuthCode', e.target.value)}
                    placeholder="输入数字/字母授权码"
                    className={`w-full h-10 pl-3.5 pr-8 rounded-xl border bg-[#FAFBF8] font-mono text-[14px] font-medium text-[#171916] tabular-nums outline-none focus:bg-white focus:border-[#171916] ${
                      isModified ? 'border-[var(--qsl-accent-border)]' : 'border-[#D9DDD4]'
                    }`}
                  />
                  {draftConfig.adminAuthCode && (
                    <button
                      type="button"
                      onClick={() => updateField('adminAuthCode', '')}
                      aria-label="清空授权码"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-[#73796F] hover:text-[#171916] hover:bg-[#EAECE6] inline-flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => updateField('adminAuthCode', generateRandomAuthCode())}
                  title="随机生成5位授权码"
                  className="h-10 px-3 rounded-xl border border-[#D9DDD4] bg-white hover:border-[#171916] text-[13px] font-medium text-[#171916] inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>生成</span>
                </button>
              </div>
            </div>
          );
        }

        if (field.kind === 'authExpiry') {
          return (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="param-adminAuthCodeExpiry"
                    className="text-[14px] font-medium text-[#171916]"
                  >
                    {field.label}
                  </label>
                  <HelpTooltip content={field.helpText} ariaLabel="查看授权码过期时间说明" />
                </div>
                {isModified && (
                  <span className="text-[12px] font-medium text-[var(--qsl-accent-soft-ink)]">已修改</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="param-adminAuthCodeExpiry"
                  type="text"
                  value={draftConfig.adminAuthCodeExpiry}
                  onChange={(e) => updateField('adminAuthCodeExpiry', e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm:ss"
                  className={`flex-1 min-w-0 h-10 px-3.5 rounded-xl border bg-[#FAFBF8] font-mono text-[14px] text-[#171916] tabular-nums outline-none focus:bg-white focus:border-[#171916] ${
                    isModified ? 'border-[var(--qsl-accent-border)]' : 'border-[#D9DDD4]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      'adminAuthCodeExpiry',
                      extendExpiryByYears(draftConfig.adminAuthCodeExpiry, 1)
                    )
                  }
                  className="h-10 px-3 rounded-xl border border-[#D9DDD4] bg-white hover:border-[#171916] text-[13px] font-medium text-[#171916] shrink-0 cursor-pointer transition-colors whitespace-nowrap"
                >
                  +1 年
                </button>
              </div>
            </div>
          );
        }

        return (
          <div key={field.key} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-medium text-[#171916]">{field.label}</span>
                <HelpTooltip content={field.helpText} ariaLabel="查看管理员手机说明" />
              </div>
              {isModified && (
                <span className="text-[12px] font-medium text-[var(--qsl-accent-soft-ink)]">已修改</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex-1 min-w-0 h-10 px-3.5 rounded-xl border bg-[#F3F5F0] flex items-center gap-2 text-[14px] font-mono tabular-nums ${
                  isModified ? 'border-[var(--qsl-accent-border)] text-[#171916]' : 'border-[#D9DDD4] text-[#5F645D]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-[#73796F] shrink-0" />
                <span className="truncate">
                  {draftConfig.salesRefundAdminPhone || '未绑定管理员手机号'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenPhoneModal}
                className="h-10 px-4 rounded-xl bg-[#171916] hover:bg-[#2F332D] text-white text-[13px] font-medium shrink-0 cursor-pointer transition-colors whitespace-nowrap"
              >
                修改
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderSectionBody = (sec: (typeof filteredSections)[number]) => {
    if (sec.id === 'admin') {
      return renderAdminSectionFields(sec.fields);
    }

    if (sec.id === 'warnings') {
      const groupOrder = Array.from(
        new Set(sec.fields.map((f) => f.subGroup ?? '默认分组'))
      );
      return (
        <div className="space-y-6 pt-2">
          {groupOrder.map((groupTitle, idx) => {
            const groupFields = sec.fields.filter(
              (f) => (f.subGroup ?? '默认分组') === groupTitle
            );
            return (
              <div
                key={groupTitle}
                className={idx > 0 ? 'pt-5 border-t border-[#E5E8E0]' : ''}
              >
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <h3 className="text-[14px] font-semibold text-[#171916]">
                    {groupTitle}
                  </h3>
                  <span className="text-[13px] text-[#73796F] tabular-nums">
                    {groupFields.length} 项
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {groupFields.map((field) => renderNumberField(field))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const choiceFields = sec.fields.filter((f) => f.kind === 'choice');
    const numberFields = sec.fields.filter((f) => f.kind === 'number');

    return (
      <div className="space-y-5 pt-2">
        {choiceFields.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {choiceFields.map((field) => renderChoiceField(field))}
          </div>
        )}
        {numberFields.length > 0 && (
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 ${
              choiceFields.length > 0 ? 'pt-3 border-t border-[#EEF0EA]' : ''
            }`}
          >
            {numberFields.map((field) => renderNumberField(field))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <SessionPolicySettings />
      {/* Inline Notice Banner */}
      {noticeText && (
        <OperationStatus>{noticeText}</OperationStatus>
      )}

      <section className="rounded-[22px] border border-[#D9DDD4] bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">界面字号</h2>
          <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => {
            setNoticeText(saveFonts(defaultFontSizes) ? '界面字号已恢复默认' : '字号已应用，本浏览器无法保存设置');
          }}>恢复默认字号</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {fontAreas.map(({ id, label }) => <label key={id} className="grid gap-1 text-sm">
            {label}
            <select value={fontSizes[id]} className="rounded-lg border bg-white px-3 py-2" onChange={event => {
              setNoticeText(saveFonts({ ...fontSizes, [id]: Number(event.target.value) }) ? '界面字号已保存' : '字号已应用，本浏览器无法保存设置');
            }}>
              {[14, 15, 16, 17, 18, 19, 20].map(size => <option key={size} value={size}>{size} px</option>)}
            </select>
          </label>)}
        </div>
        <p className="mt-3 text-xs text-[#73796F]">更改立即生效，并保存在当前浏览器。</p>
      </section>

      {/* Top Toolbar: Store Scope + Search + Save / Sync Actions */}
      <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[14px] font-medium text-[#5F645D] whitespace-nowrap">
              配置门店
            </span>
            <Select
              ariaLabel="选择配置参数的门店"
              variant="pill"
              prefixIcon={<Store className="w-4 h-4 text-[#5F645D] shrink-0" />}
              value={selectedStoreId}
              onChange={(val) => setSelectedStoreId(val)}
              buttonClassName="min-w-[190px] max-w-[260px]"
              menuMinWidth={240}
              options={stores.map((st) => ({
                value: st.id,
                label: `${st.name}（${st.storeType}）`,
              }))}
            />
          </div>

          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[#73796F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索参数名称、规则关键字或分类..."
              className="w-full h-10 pl-9 pr-9 rounded-full bg-[#F8F9F5] border border-[#D9DDD4] text-[14px] text-[#171916] placeholder:text-[#73796F] outline-none focus:bg-white focus:border-[#171916]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="清空搜索"
                className="w-6 h-6 rounded-full text-[#73796F] hover:text-[#171916] hover:bg-[#EAECE6] absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyModified((prev) => !prev)}
            className={`h-10 px-4 rounded-full border text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
              onlyModified
                ? 'bg-[#171916] border-[#171916] text-white'
                : 'bg-[#F8F9F5] border-[#D9DDD4] text-[#5F645D] hover:text-[#171916] hover:border-[#171916]'
            }`}
          >
            仅看未保存改动{unsavedKeys.length > 0 ? ` (${unsavedKeys.length})` : ''}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <span className="text-[13px] text-[#73796F] tabular-nums mr-1 whitespace-nowrap">
            {unsavedKeys.length > 0
              ? `当前有 ${unsavedKeys.length} 项待保存`
              : '共 61 项参数 · 已保存'}
          </span>

          <Button
            variant="secondary"
            size="md"
            icon={<CopyCheck className="w-4 h-4" />}
            onClick={handleOpenSyncModal}
          >
            同步其他门店
          </Button>

          <Button
            variant="ghost"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={() => setResetModalOpen(true)}
          >
            恢复默认
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSave}
          >
            保存设置
          </Button>
        </div>
      </div>

      {/* Mobile / Tablet Quick Horizontal Anchor Bar */}
      {filteredSections.length > 0 && (
        <div className="xl:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {filteredSections.map((sec) => {
            const active = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`h-9 px-3.5 rounded-full text-[13px] whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#171916] border-[#171916] text-white font-semibold'
                    : 'bg-white border-[#D9DDD4] text-[#5F645D] hover:text-[#171916]'
                }`}
              >
                {sec.code}. {sec.shortTitle}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Split: Left Sticky Mini Anchor Navigation + Right Parameter Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Mini Anchor Navigation */}
        <aside
          aria-label="参数设置目录锚点导航"
          className="hidden xl:block xl:col-span-3 xl:sticky xl:top-20"
        >
          <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-4">
            <div className="px-2 pb-3 border-b border-[#EEF0EA] flex items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[#171916]">参数分类导航</h2>
              <span className="text-[12px] text-[#73796F] tabular-nums">
                {filteredSections.length} 类 ·{' '}
                {filteredSections.reduce((sum, s) => sum + s.fields.length, 0)} 项
              </span>
            </div>

            {filteredSections.length === 0 ? (
              <div className="py-6 px-2 text-center text-[13px] text-[#73796F]">
                无匹配分类
              </div>
            ) : (
              <nav className="mt-2.5 space-y-1">
                {filteredSections.map((sec) => {
                  const active = activeSectionId === sec.id;
                  const modifiedCount = sec.fields.filter((f) =>
                    unsavedKeySet.has(f.key)
                  ).length;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--qsl-accent-soft)] text-[#171916] font-semibold'
                          : 'text-[#5F645D] hover:text-[#171916] hover:bg-[#F5F6F2]'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-[12px] font-mono tabular-nums shrink-0 ${
                            active ? 'text-[#171916]' : 'text-[#8B9087]'
                          }`}
                        >
                          {sec.code}
                        </span>
                        <span className="text-[14px] truncate">{sec.shortTitle}</span>
                      </span>

                      <span className="flex items-center gap-1.5 shrink-0 text-[12px] tabular-nums">
                        {modifiedCount > 0 && (
                          <span className="text-[var(--qsl-accent-soft-ink)] font-medium">
                            *{modifiedCount}
                          </span>
                        )}
                        <span className={active ? 'text-[#171916]/80' : 'text-[#8B9087]'}>
                          {sec.fields.length}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="mt-4 pt-3 border-t border-[#EEF0EA] px-2 flex items-center justify-between text-[12px] text-[#73796F]">
              <span className="truncate">{selectedStoreName}</span>
              <button
                type="button"
                onClick={() =>
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
                className="text-[#5F645D] hover:text-[#171916] cursor-pointer shrink-0"
              >
                回到顶部
              </button>
            </div>
          </div>
        </aside>

        {/* Right Parameter Cards */}
        <div className="xl:col-span-9 space-y-5">
          {filteredSections.length === 0 ? (
            <div className="bg-white border border-[#D9DDD4] rounded-[22px] p-10">
              <EmptyState
                mode="filtered"
                title="未找到匹配的系统参数"
                description={
                  onlyModified
                    ? '当前筛选条件下没有未保存的参数改动，可取消「仅看未保存改动」查看全部参数。'
                    : '未检索到符合关键字的参数项，请尝试调整搜索条件。'
                }
                actionLabel="显示全部参数"
                onAction={() => {
                  setSearchQuery('');
                  setOnlyModified(false);
                }}
              />
            </div>
          ) : (
            filteredSections.map((sec) => {
              const modifiedInSection = sec.fields.filter((f) =>
                unsavedKeySet.has(f.key)
              ).length;

              return (
                <section
                  key={sec.id}
                  id={`param-section-${sec.id}`}
                  data-section-id={sec.id}
                  ref={(el) => {
                    sectionRefs.current[sec.id] = el;
                  }}
                  className="bg-white border border-[#D9DDD4] rounded-[22px] p-6 scroll-mt-24"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E5E8E0]">
                    <div className="min-w-0">
                      <h2 className="text-[19px] font-semibold text-[#171916] leading-snug">
                        {sec.code}. {sec.title}
                      </h2>
                      <p className="mt-1 text-[14px] text-[#5F645D] leading-relaxed">
                        {sec.description}
                      </p>
                    </div>
                    <div className="text-[13px] text-[#73796F] tabular-nums shrink-0 whitespace-nowrap">
                      <span>共 {sec.fields.length} 项</span>
                      {modifiedInSection > 0 && (
                        <span className="text-[var(--qsl-accent-soft-ink)] font-medium">
                          {' '}
                          · {modifiedInSection} 项待保存
                        </span>
                      )}
                    </div>
                  </div>

                  {renderSectionBody(sec)}
                </section>
              );
            })
          )}
        </div>
      </div>

      {/* Sync To Other Stores Modal */}
      <Modal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        title="同步参数设置至其他门店"
        subtitle={`来源门店：${selectedStoreName}`}
        maxWidthClass="max-w-xl"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <span className="text-[13px] text-[#5F645D] tabular-nums">
              已选择 {syncTargetIds.length} 家目标门店
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setSyncModalOpen(false)}>
                取消
              </Button>
              <Button
                variant="primary"
                disabled={syncTargetIds.length === 0}
                onClick={handleConfirmSync}
              >
                确认同步
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-[14px] font-medium text-[#171916]">同步范围</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSyncScope('all')}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  syncScope === 'all'
                    ? 'bg-[var(--qsl-accent-soft-85)] border-[var(--qsl-brand-dark)] text-[#171916]'
                    : 'bg-white/70 border-[#D9DDD4] text-[#5F645D] hover:border-[#171916]/50'
                }`}
              >
                <div className="text-[14px] font-semibold text-[#171916]">
                  同步全部参数（61项）
                </div>
                <div className="text-[12px] text-[#5F645D] mt-0.5">
                  将当前门店整套参数覆盖至所选目标门店
                </div>
              </button>

              <button
                type="button"
                disabled={unsavedKeys.length === 0}
                onClick={() => setSyncScope('changed')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  unsavedKeys.length === 0
                    ? 'bg-[#F3F5F0]/70 border-[#E5E8E0] text-[#A8ADA4] cursor-not-allowed'
                    : syncScope === 'changed'
                      ? 'bg-[var(--qsl-accent-soft-85)] border-[var(--qsl-brand-dark)] text-[#171916] cursor-pointer'
                      : 'bg-white/70 border-[#D9DDD4] text-[#5F645D] hover:border-[#171916]/50 cursor-pointer'
                }`}
              >
                <div className="text-[14px] font-semibold">
                  仅同步本次改动（{unsavedKeys.length} 项）
                </div>
                <div className="text-[12px] opacity-80 mt-0.5">
                  {unsavedKeys.length > 0
                    ? '保留目标门店其余原有参数配置'
                    : '当前尚无未保存的单项修改'}
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#171916]">选择目标门店</span>
              <div className="flex items-center gap-3 text-[13px]">
                <button
                  type="button"
                  onClick={() =>
                    setSyncTargetIds(
                      stores.filter((s) => s.id !== selectedStoreId).map((s) => s.id)
                    )
                  }
                  className="text-[#171916] hover:underline cursor-pointer"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setSyncTargetIds([])}
                  className="text-[#5F645D] hover:text-[#171916] cursor-pointer"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto qsl-scroll divide-y divide-[#EEF0EA] rounded-xl border border-[#D9DDD4] bg-white/80">
              {stores
                .filter((s) => s.id !== selectedStoreId)
                .map((st) => {
                  const checked = syncTargetIds.includes(st.id);
                  return (
                    <label
                      key={st.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#FAFBF8] cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSyncTargetIds((prev) => [...prev, st.id]);
                            } else {
                              setSyncTargetIds((prev) => prev.filter((id) => id !== st.id));
                            }
                          }}
                          className="w-4 h-4 accent-[#171916] rounded cursor-pointer"
                        />
                        <span className="text-[14px] font-medium text-[#171916] truncate">
                          {st.name}
                        </span>
                      </span>
                      <span className="text-[12px] text-[#73796F] shrink-0">
                        {st.storeType} · {st.city}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Reset Default Confirmation Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="恢复默认系统参数"
        subtitle={`目标门店：${selectedStoreName}`}
        maxWidthClass="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleConfirmReset}>
              确认恢复默认
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-[#5F645D] leading-relaxed">
          此操作会将「<span className="font-semibold text-[#171916]">{selectedStoreName}</span>
          」的全部 61 项业务与安全参数重置为系统默认推荐配置，确定继续吗？
        </p>
      </Modal>

      {/* Edit Admin Refund Phone Modal */}
      <Modal
        open={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        title="修改销售退款管理员手机"
        subtitle={`所属门店：${selectedStoreName}`}
        maxWidthClass="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setPhoneModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                handleSavePhone(fakeEvent);
              }}
            >
              确认修改
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSavePhone} className="space-y-3">
          <div>
            <label
              htmlFor="admin-phone-input"
              className="block text-[14px] font-medium text-[#171916] mb-1.5"
            >
              管理员手机号码
            </label>
            <input
              id="admin-phone-input"
              type="tel"
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value);
                setPhoneError(null);
              }}
              placeholder="请输入 11 位手机号码（留空表示解绑）"
              className="w-full h-10 px-3.5 rounded-xl border border-[#D9DDD4] bg-white text-[14px] font-mono tabular-nums text-[#171916] outline-none focus:border-[#171916]"
            />
            {phoneError && (
              <p className="mt-1.5 text-[13px] text-[#DC2626]">{phoneError}</p>
            )}
          </div>
          <p className="text-[13px] text-[#73796F]">
            用于接收门店销售退款、冲红或超权改价的短信验证码与风控通知。
          </p>
        </form>
      </Modal>
    </div>
  );
};
