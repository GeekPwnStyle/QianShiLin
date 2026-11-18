import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ImagePlus,
  RefreshCw,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import {
  CUSTOMER_AGE_GROUP_OPTIONS,
  CUSTOMER_TIER_OPTIONS,
  computeAgeFromBirthday,
  customersApi,
  suggestAgeGroup,
  type CustomerProfile,
  type CustomerTagDefinition,
  type CustomerWritePayload,
} from '@/src/modules/basic/customers/infrastructure/customersApi';
import { Modal } from '@/src/shared/ui/Modal';
import { Button } from '@/src/shared/ui/Button';

export interface CustomerFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialCustomer: CustomerProfile | null;
  authorizedStores: Array<{ id: string; name: string }>;
  defaultStoreId: string;
  defaultGuideName: string;
  debugMode: boolean;
  tags: CustomerTagDefinition[];
  tagsFetching: boolean;
  onRefreshTags: () => Promise<unknown>;
  onClose: () => void;
  onSaved: (item: CustomerProfile, action: 'close' | 'edit_more') => void;
}

interface FormState {
  name: string;
  phone: string;
  gender: '男' | '女';
  birthday: string;
  age: number;
  ageGroup: string;
  address: string;
  remark: string;
  memberNo: string;
  tier: string;
  avatarUrl: string | null;
  medicalIdNo: string;
  tags: string[];
  storeId: string;
  guideName: string;
  source: string;
  relatedAccount: string;
  customerType: string;
  wechatFollowed: boolean;
  nextReviewDate: string;
}

function buildInitialState(
  mode: 'create' | 'edit',
  customer: CustomerProfile | null,
  defaultStoreId: string,
  defaultGuideName: string
): FormState {
  if (mode === 'edit' && customer) {
    return {
      name: customer.name,
      phone: customer.phone,
      gender: customer.gender,
      birthday: customer.birthday || '',
      age: customer.age ?? 0,
      ageGroup: customer.ageGroup || '',
      address: customer.address || '',
      remark: customer.remark || '',
      memberNo: customer.memberNo || '',
      tier: customer.tier || '普通顾客',
      avatarUrl: customer.avatarUrl ?? null,
      medicalIdNo: customer.medicalIdNo || '',
      tags: Array.isArray(customer.tags) ? customer.tags : [],
      storeId: customer.storeId || defaultStoreId,
      guideName: customer.guideName || '',
      source: customer.source || '门店新建',
      relatedAccount: customer.relatedAccount || '',
      customerType: customer.customerType || '普通客群',
      wechatFollowed: Boolean(customer.wechatFollowed),
      nextReviewDate: customer.nextReviewDate || '',
    };
  }
  return {
    name: '',
    phone: '',
    gender: '男',
    birthday: '',
    age: 0,
    ageGroup: '',
    address: '',
    remark: '',
    memberNo: '',
    tier: '普通顾客',
    avatarUrl: null,
    medicalIdNo: '',
    tags: [],
    storeId: defaultStoreId,
    guideName: defaultGuideName,
    source: '门店新建',
    relatedAccount: '',
    customerType: '普通客群',
    wechatFollowed: false,
    nextReviewDate: '',
  };
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  open,
  mode,
  initialCustomer,
  authorizedStores,
  defaultStoreId,
  defaultGuideName,
  debugMode,
  tags,
  tagsFetching,
  onRefreshTags,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(mode, initialCustomer, defaultStoreId, defaultGuideName)
  );
  const [formError, setFormError] = useState('');
  const [submittingAction, setSubmittingAction] = useState<'close' | 'edit_more' | null>(null);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagActionError, setTagActionError] = useState('');
  const [tagSaving, setTagSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialState(mode, initialCustomer, defaultStoreId, defaultGuideName));
    setFormError('');
    setSubmittingAction(null);
    setTagDropdownOpen(false);
  }, [open, mode, initialCustomer?.id, defaultStoreId, defaultGuideName]);

  useEffect(() => {
    if (!tagDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [tagDropdownOpen]);

  const handleBirthdayChange = (nextBirthday: string) => {
    if (!nextBirthday) {
      setForm((prev) => ({ ...prev, birthday: '' }));
      return;
    }
    const nextAge = computeAgeFromBirthday(nextBirthday);
    const nextAgeGroup = suggestAgeGroup(nextAge);
    setForm((prev) => ({
      ...prev,
      birthday: nextBirthday,
      age: nextAge,
      ageGroup: nextAgeGroup,
    }));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('请选择图片格式文件（JPG / PNG / WebP）。');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('头像图片大小请控制在 5MB 以内。');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setFormError('图片读取失败，请重试。');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const size = 192;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setForm((prev) => ({ ...prev, avatarUrl: result }));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const compressed = canvas.toDataURL('image/jpeg', 0.86);
        setForm((prev) => ({ ...prev, avatarUrl: compressed }));
      };
      img.onerror = () => setFormError('无法解析该图片文件，请更换其他图片。');
      img.src = result;
    };
    reader.onerror = () => setFormError('图片读取失败，请重试。');
    reader.readAsDataURL(file);
  };

  const toggleTag = (tagName: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter((t) => t !== tagName)
        : [...prev.tags, tagName],
    }));
  };

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setTagSaving(true);
    setTagActionError('');
    try {
      const created = await customersApi.createTag(name, debugMode);
      setNewTagName('');
      await onRefreshTags();
      setForm((prev) => ({
        ...prev,
        tags: prev.tags.includes(created.name) ? prev.tags : [...prev.tags, created.name],
      }));
    } catch (error) {
      setTagActionError(error instanceof Error ? error.message : '新增标签失败');
    } finally {
      setTagSaving(false);
    }
  };

  const handleDeleteTag = async (tag: CustomerTagDefinition) => {
    setTagActionError('');
    try {
      await customersApi.deleteTag(tag.id, debugMode);
      setForm((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t !== tag.name),
      }));
      await onRefreshTags();
    } catch (error) {
      setTagActionError(error instanceof Error ? error.message : '删除标签失败');
    }
  };

  const handleSubmit = async (action: 'close' | 'edit_more') => {
    setFormError('');
    const trimmedName = form.name.trim();
    const trimmedPhone = form.phone.trim();

    if (!trimmedName) {
      setFormError('请输入顾客姓名');
      return;
    }
    if (mode === 'create') {
      if (!/^1\d{10}$/.test(trimmedPhone)) {
        setFormError('请输入有效的 11 位手机号');
        return;
      }
    } else if (!trimmedPhone.includes('****') && !/^1\d{10}$/.test(trimmedPhone)) {
      setFormError('请输入有效的 11 位手机号');
      return;
    }

    if (Array.from(form.address).length > 50) {
      setFormError('地址不能超过 50 个字');
      return;
    }
    if (Array.from(form.remark).length > 300) {
      setFormError('备注不能超过 300 个字');
      return;
    }

    const payload: CustomerWritePayload = {
      name: trimmedName,
      phone: trimmedPhone,
      gender: form.gender,
      birthday: form.birthday || null,
      age: Number.isFinite(form.age) ? Math.max(0, Math.min(150, Math.trunc(form.age))) : 0,
      ageGroup: form.ageGroup,
      address: form.address.trim(),
      remark: form.remark.trim(),
      memberNo: form.memberNo.trim(),
      tier: form.tier || '普通顾客',
      avatarUrl: form.avatarUrl,
      medicalIdNo: form.medicalIdNo.trim(),
      tags: form.tags,
      storeId: form.storeId || authorizedStores[0]?.id || 'store_hq_01',
      guideName: form.guideName.trim(),
      source: form.source.trim() || '门店新建',
      relatedAccount: form.relatedAccount.trim(),
      customerType: form.customerType.trim() || '普通客群',
      wechatFollowed: form.wechatFollowed,
      nextReviewDate: form.nextReviewDate || null,
    };

    setSubmittingAction(action);
    try {
      const saved =
        mode === 'create'
          ? await customersApi.create(payload, debugMode)
          : await customersApi.update(initialCustomer!.id, payload, debugMode);
      onSaved(saved, action);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '保存顾客资料失败');
    } finally {
      setSubmittingAction(null);
    }
  };

  const addressCount = Array.from(form.address).length;
  const remarkCount = Array.from(form.remark).length;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={mode === 'create' ? '新增 顾客资料' : `顾客资料详情与编辑 · ${initialCustomer?.name ?? ''}`}
        subtitle={
          mode === 'edit' && initialCustomer
            ? `会员卡号：${initialCustomer.memberNo} · 归属门店：${initialCustomer.storeName}`
            : undefined
        }
        maxWidthClass="max-w-4xl"
        footer={
          mode === 'create' ? (
            <div className="flex flex-wrap items-center justify-end gap-2.5 w-full">
              <Button variant="secondary" onClick={onClose} disabled={submittingAction !== null}>
                取消
              </Button>
              <Button
                variant="primary"
                loading={submittingAction === 'close'}
                disabled={submittingAction !== null}
                onClick={() => void handleSubmit('close')}
              >
                保存后关闭
              </Button>
              <Button
                variant="accent"
                loading={submittingAction === 'edit_more'}
                disabled={submittingAction !== null}
                onClick={() => void handleSubmit('edit_more')}
              >
                保存后查看和编辑其他信息
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2.5 w-full">
              <Button variant="secondary" onClick={onClose} disabled={submittingAction !== null}>
                关闭
              </Button>
              <Button
                variant="accent"
                loading={submittingAction === 'close'}
                disabled={submittingAction !== null}
                onClick={() => void handleSubmit('close')}
              >
                保存修改
              </Button>
            </div>
          )
        }
      >
        <div className="space-y-4 text-[14px]">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          {/* Row 1: * 姓名 | * 手机号 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <span className="text-right text-[#4E544B] font-medium">
                <span className="text-red-600 mr-1">*</span>姓名
              </span>
              <input
                type="text"
                maxLength={80}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="请输入顾客姓名"
                className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
              />
            </label>

            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <span className="text-right text-[#4E544B] font-medium">
                <span className="text-red-600 mr-1">*</span>手机号
              </span>
              <input
                type="tel"
                maxLength={20}
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder={
                  mode === 'edit' && form.phone.includes('****')
                    ? '当前已脱敏展示，输入新 11 位号可更新'
                    : '请输入 11 位手机号'
                }
                className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 font-mono text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
              />
            </label>

            {/* Row 2: * 性别 | 生日 */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <span className="text-right text-[#4E544B] font-medium">
                <span className="text-red-600 mr-1">*</span>性别
              </span>
              <div className="flex items-center gap-6 h-10" role="radiogroup" aria-label="性别">
                {(['男', '女'] as const).map((g) => {
                  const selected = form.gender === g;
                  return (
                    <label
                      key={g}
                      className="inline-flex items-center gap-2 cursor-pointer select-none text-[#171916]"
                    >
                      <input
                        type="radio"
                        name="customer-gender"
                        value={g}
                        checked={selected}
                        onChange={() => setForm((prev) => ({ ...prev, gender: g }))}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded-full border inline-flex items-center justify-center transition-colors ${
                          selected
                            ? 'border-[var(--qsl-brand-dark)] bg-[var(--qsl-accent)]'
                            : 'border-[#AEB4AA] bg-white'
                        }`}
                      >
                        {selected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--qsl-accent-ink)]" />
                        )}
                      </span>
                      <span className={selected ? 'font-semibold' : 'text-[#5F645D]'}>{g}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <label htmlFor="customer-birthday" className="text-right text-[#4E544B] font-medium">
                生日
              </label>
              <div>
                <input
                  id="customer-birthday"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.birthday}
                  onChange={(e) => handleBirthdayChange(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
                />
                <p className="mt-1 text-[12px] text-[#73796F]">选择生日后，会自动更新年龄</p>
              </div>
            </div>

            {/* Row 3: 年龄 | 年龄段 */}
            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <span className="text-right text-[#4E544B] font-medium">年龄</span>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={0}
                  max={150}
                  value={form.age}
                  onChange={(e) => {
                    const num = Number.parseInt(e.target.value || '0', 10);
                    const safeAge = Number.isNaN(num) ? 0 : Math.max(0, Math.min(150, num));
                    setForm((prev) => ({
                      ...prev,
                      age: safeAge,
                      ageGroup: prev.ageGroup || suggestAgeGroup(safeAge),
                    }));
                  }}
                  className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] pl-3 pr-9 text-[#171916] tabular-nums outline-none focus:bg-white focus:border-[#171916]"
                />
                <span className="absolute right-3 text-[13px] text-[#73796F] pointer-events-none">
                  岁
                </span>
              </div>
            </label>

            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <span className="text-right text-[#4E544B] font-medium">年龄段</span>
              <select
                value={form.ageGroup}
                onChange={(e) => setForm((prev) => ({ ...prev, ageGroup: e.target.value }))}
                className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
              >
                <option value="">请选择</option>
                {CUSTOMER_AGE_GROUP_OPTIONS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>

            {/* Row 4: 地址 | 备注 */}
            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3">
              <span className="text-right text-[#4E544B] font-medium pt-2">地址</span>
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={50}
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="请输入联系地址"
                  className="w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 py-2 pb-6 text-[#171916] resize-none outline-none focus:bg-white focus:border-[#171916]"
                />
                <span className="absolute right-2.5 bottom-1.5 text-[11px] text-[#73796F] tabular-nums">
                  {addressCount} / 50
                </span>
              </div>
            </label>

            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3">
              <span className="text-right text-[#4E544B] font-medium pt-2">备注</span>
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={300}
                  value={form.remark}
                  onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="佩戴习惯、偏好镜型或沟通备注"
                  className="w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 py-2 pb-6 text-[#171916] resize-none outline-none focus:bg-white focus:border-[#171916]"
                />
                <span className="absolute right-2.5 bottom-1.5 text-[11px] text-[#73796F] tabular-nums">
                  {remarkCount} / 300
                </span>
              </div>
            </label>

            {/* Row 5: 会员卡号 | 会员等级 */}
            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <span className="text-right text-[#4E544B] font-medium">会员卡号</span>
              <input
                type="text"
                maxLength={40}
                value={form.memberNo}
                onChange={(e) => setForm((prev) => ({ ...prev, memberNo: e.target.value }))}
                placeholder="留空保存时自动生成"
                className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 font-mono text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
              />
            </label>

            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
              <span className="text-right text-[#4E544B] font-medium">会员等级</span>
              <select
                value={form.tier}
                onChange={(e) => setForm((prev) => ({ ...prev, tier: e.target.value }))}
                className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
              >
                {CUSTOMER_TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            {/* Row 6: 头像 | 医保/证件号 */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3">
              <span className="text-right text-[#4E544B] font-medium pt-2">头像</span>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                {form.avatarUrl ? (
                  <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-[#D9DDD4] bg-[#F8F9F5]">
                    <img
                      src={form.avatarUrl}
                      alt="顾客头像预览"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#171916]/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="更换图片"
                        className="px-2 py-1 rounded-md bg-white text-[11px] font-medium text-[#171916] cursor-pointer"
                      >
                        更换
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, avatarUrl: null }))}
                        title="移除图片"
                        className="p-1 rounded-md bg-red-600 text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-20 rounded-xl border border-dashed border-[#C5CAC0] bg-[#F8F9F5] hover:border-[#171916] hover:bg-white transition-colors flex flex-col items-center justify-center gap-1.5 text-[#5F645D] cursor-pointer"
                  >
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[12px]">上传图片</span>
                  </button>
                )}
              </div>
            </div>

            <label className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3">
              <span className="text-right text-[#4E544B] font-medium pt-2">医保/证件号</span>
              <input
                type="text"
                maxLength={64}
                value={form.medicalIdNo}
                onChange={(e) => setForm((prev) => ({ ...prev, medicalIdNo: e.target.value }))}
                placeholder="请输入医保卡号或身份证号"
                className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 font-mono text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
              />
            </label>
          </div>

          {/* Row 7: 标签：请选择 [设置按钮] [刷新图标] */}
          <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3">
            <span className="text-right text-[#4E544B] font-medium pt-2">标签</span>
            <div className="flex flex-wrap items-center gap-2">
              <div ref={tagDropdownRef} className="relative flex-1 min-w-[220px] max-w-md">
                <button
                  type="button"
                  onClick={() => setTagDropdownOpen((v) => !v)}
                  aria-expanded={tagDropdownOpen}
                  className="min-h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] hover:border-[#B8BEB2] px-3 py-1.5 flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {form.tags.length === 0 ? (
                      <span className="text-[#73796F]">请选择</span>
                    ) : (
                      form.tags.map((tagName) => (
                        <span
                          key={tagName}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--qsl-accent-soft)] border border-[var(--qsl-accent-soft-border)] text-[12px] text-[#171916]"
                        >
                          <span>{tagName}</span>
                          <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTag(tagName);
                            }}
                            className="hover:text-red-700 cursor-pointer"
                          >
                            ×
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#73796F] shrink-0" />
                </button>

                {tagDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-full rounded-xl border border-[#D9DDD4] bg-white shadow-xl p-1.5 z-40 max-h-52 overflow-y-auto qsl-scroll">
                    {tags.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[#73796F]">
                        暂无可用标签，请点击右侧设置新增
                      </div>
                    ) : (
                      tags.map((tag) => {
                        const checked = form.tags.includes(tag.name);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.name)}
                            className={`w-full px-3 py-2 rounded-lg text-left text-[13px] flex items-center justify-between cursor-pointer ${
                              checked
                                ? 'bg-[var(--qsl-accent-soft-65)] font-medium text-[#171916]'
                                : 'hover:bg-[#F8F9F5] text-[#171916]'
                            }`}
                          >
                            <span>{tag.name}</span>
                            {checked && <Check className="w-4 h-4 text-[#171916]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                title="管理顾客标签库"
                aria-label="设置顾客标签"
                onClick={() => {
                  setTagActionError('');
                  setTagManagerOpen(true);
                }}
                className="h-10 w-10 rounded-[10px] border border-[#D9DDD4] bg-white hover:border-[#171916] inline-flex items-center justify-center text-[#5F645D] hover:text-[#171916] cursor-pointer transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="刷新标签列表"
                aria-label="刷新顾客标签"
                onClick={() => void onRefreshTags()}
                className="h-10 w-10 rounded-[10px] border border-[#D9DDD4] bg-white hover:border-[#171916] inline-flex items-center justify-center text-[#5F645D] hover:text-[#171916] cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${tagsFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Store selection when multiple stores authorized OR Edit/Other Info section */}
          {(authorizedStores.length > 1 || mode === 'edit') && (
            <div className="pt-4 mt-2 border-t border-[#E5E8E0] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-semibold text-[#171916]">
                  {mode === 'edit' ? '其他信息与门店归属' : '归属门店设置'}
                </h4>
                {mode === 'edit' && initialCustomer && (
                  <div className="flex flex-wrap gap-3 text-[12px] text-[#5F645D]">
                    <span>积分：<strong className="text-[#171916]">{initialCustomer.pointsBalance}</strong></span>
                    <span>余额：<strong className="text-[#171916]">¥{initialCustomer.storedValueBalance}</strong></span>
                    <span>到店：<strong className="text-[#171916]">{initialCustomer.visitCount} 次</strong></span>
                    <span>最近到店：<strong className="text-[#171916]">{initialCustomer.lastVisitDate || '—'}</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                  <span className="text-right text-[#4E544B] font-medium">归属门店</span>
                  <select
                    value={form.storeId}
                    onChange={(e) => setForm((prev) => ({ ...prev, storeId: e.target.value }))}
                    className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
                  >
                    {authorizedStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                {mode === 'edit' && (
                  <>
                    <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                      <span className="text-right text-[#4E544B] font-medium">导购绑定</span>
                      <input
                        type="text"
                        maxLength={80}
                        value={form.guideName}
                        onChange={(e) => setForm((prev) => ({ ...prev, guideName: e.target.value }))}
                        placeholder="请输入专属导购员"
                        className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
                      />
                    </label>

                    <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                      <span className="text-right text-[#4E544B] font-medium">顾客来源</span>
                      <select
                        value={form.source}
                        onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                        className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
                      >
                        {['门店新建', '门店接待', '老客转介绍', '线上预约', '视光筛查转入', '其他渠道'].map(
                          (src) => (
                            <option key={src} value={src}>
                              {src}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                      <span className="text-right text-[#4E544B] font-medium">顾客类型</span>
                      <select
                        value={form.customerType}
                        onChange={(e) => setForm((prev) => ({ ...prev, customerType: e.target.value }))}
                        className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
                      >
                        {['普通客群', '高价值会员', '青少年近视管理', '老客复购', '隐形复购客'].map(
                          (ct) => (
                            <option key={ct} value={ct}>
                              {ct}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                      <span className="text-right text-[#4E544B] font-medium">关联账号</span>
                      <input
                        type="text"
                        maxLength={80}
                        value={form.relatedAccount}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, relatedAccount: e.target.value }))
                        }
                        placeholder="绑定主账号或家庭成员账号"
                        className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
                      />
                    </label>

                    <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                      <span className="text-right text-[#4E544B] font-medium">下次复查</span>
                      <input
                        type="date"
                        value={form.nextReviewDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, nextReviewDate: e.target.value }))
                        }
                        className="h-10 w-full rounded-[10px] border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-[#171916] outline-none focus:bg-white focus:border-[#171916]"
                      />
                    </label>

                    <label className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3 md:col-span-2">
                      <span className="text-right text-[#4E544B] font-medium">公众号</span>
                      <span className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.wechatFollowed}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, wechatFollowed: e.target.checked }))
                          }
                        />
                        <span>已关注门店服务号</span>
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Tag Library Settings Modal */}
      <Modal
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        title="设置顾客标签"
        subtitle="新增或移除全门店通用的顾客标签选项"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={40}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAddTag();
                }
              }}
              placeholder="输入新标签名称，例如：老花多焦"
              className="h-10 flex-1 rounded-xl border border-[#D9DDD4] bg-[#F8F9F5] px-3 text-sm outline-none focus:bg-white focus:border-[#171916]"
            />
            <Button
              variant="accent"
              size="md"
              loading={tagSaving}
              disabled={!newTagName.trim()}
              onClick={() => void handleAddTag()}
            >
              添加标签
            </Button>
          </div>

          {tagActionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {tagActionError}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto qsl-scroll divide-y divide-[#EEF0E9] rounded-xl border border-[#E5E8E0]">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="px-3.5 py-2.5 flex items-center justify-between text-sm"
              >
                <span className="text-[#171916] font-medium">{tag.name}</span>
                <button
                  type="button"
                  onClick={() => void handleDeleteTag(tag)}
                  aria-label={`删除标签${tag.name}`}
                  className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>移除</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};
