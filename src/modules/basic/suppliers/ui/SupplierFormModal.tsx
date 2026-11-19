import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, ScanLine, Trash2 } from 'lucide-react';
import {
  CITY_DIRECTORY,
  suppliersApi,
  toPinyinInitials,
  type SupplierRecord,
  type SupplierWritePayload,
} from '@/src/modules/basic/suppliers/infrastructure/suppliersApi';
import { Button } from '@/src/shared/ui/Button';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';

export interface SupplierFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialSupplier: SupplierRecord | null;
  canEditBank: boolean;
  defaultStoreName: string;
  debugMode: boolean;
  onClose: () => void;
  onSaved: (record: SupplierRecord, mode: 'create' | 'edit') => void;
}

interface FormState {
  name: string;
  alias: string;
  alias_pinyin: string;
  contact: string;
  phone: string;
  landline: string;
  wechat: string;
  qq: string;
  credit_code: string;
  shipping_area_code: string;
  province: string;
  city: string;
  district: string;
  sort_order: string;
  detail_address: string;
  scope: string;
  bank_holder: string;
  bank_branch: string;
  bank_account: string;
  business_license_image: string;
  business_license_expires_on: string;
  device_license_image: string;
  device_license_expires_on: string;
  device_license_number: string;
  device_license_issued_on: string;
  device_license_issuer: string;
  device_license_valid_from: string;
  enabled: boolean;
  is_supply_chain: boolean;
  is_default: boolean;
  remark: string;
  categories: string;
  login_username: string;
  login_password: string;
}

function toInitialState(
  mode: 'create' | 'edit',
  supplier: SupplierRecord | null
): FormState {
  if (mode === 'edit' && supplier) {
    return {
      name: supplier.name || '',
      alias: supplier.alias || '',
      alias_pinyin: supplier.alias_pinyin || '',
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      landline: supplier.landline || '',
      wechat: supplier.wechat || '',
      qq: supplier.qq || '',
      credit_code: supplier.credit_code || '',
      shipping_area_code: supplier.shipping_area_code || '',
      province: supplier.province || '',
      city: supplier.city || '',
      district: supplier.district || '',
      sort_order: String(supplier.sort_order ?? 100),
      detail_address: supplier.detail_address || '',
      scope: supplier.scope || '',
      bank_holder: supplier.bank_holder || '',
      bank_branch: supplier.bank_branch || '',
      bank_account: supplier.bank_account || '',
      business_license_image: supplier.business_license_image || '',
      business_license_expires_on: supplier.business_license_expires_on || '',
      device_license_image: supplier.device_license_image || '',
      device_license_expires_on: supplier.device_license_expires_on || '',
      device_license_number: supplier.device_license_number || '',
      device_license_issued_on: supplier.device_license_issued_on || '',
      device_license_issuer: supplier.device_license_issuer || '',
      device_license_valid_from: supplier.device_license_valid_from || '',
      enabled: supplier.enabled !== false,
      is_supply_chain: Boolean(supplier.is_supply_chain),
      is_default: Boolean(supplier.is_default),
      remark: supplier.remark || '',
      categories: Array.isArray(supplier.categories) ? supplier.categories.join('、') : '',
      login_username: supplier.login_username || '',
      login_password: '',
    };
  }
  return {
    name: '',
    alias: '',
    alias_pinyin: '',
    contact: '',
    phone: '',
    landline: '',
    wechat: '',
    qq: '',
    credit_code: '',
    shipping_area_code: '',
    province: '',
    city: '',
    district: '',
    sort_order: '100',
    detail_address: '',
    scope: '',
    bank_holder: '',
    bank_branch: '',
    bank_account: '',
    business_license_image: '',
    business_license_expires_on: '',
    device_license_image: '',
    device_license_expires_on: '',
    device_license_number: '',
    device_license_issued_on: '',
    device_license_issuer: '',
    device_license_valid_from: '',
    enabled: true,
    is_supply_chain: false,
    is_default: false,
    remark: '',
    categories: '',
    login_username: '',
    login_password: '',
  };
}

async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件（PNG / JPG / WebP）');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('图片体积不得超过 5MB');
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析图片失败'));
      img.onload = () => {
        const maxSide = 1100;
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/webp', 0.84);
        resolve(out.startsWith('data:image/') ? out : canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const fieldInputClass =
  'h-9 w-full rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm text-[#171916] placeholder:text-[#9AA096] outline-none transition-colors focus:border-[#171916] focus:ring-2 focus:ring-[#171916]/[0.06]';

const SectionDivider: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center gap-3 pt-2">
    <span className="h-[1px] w-6 bg-[#2D6A4F]/50" />
    <span className="text-[13px] font-semibold text-[#171916] tracking-wide">{title}</span>
    <span className="h-[1px] flex-1 bg-[#E5E8E0]" />
  </div>
);

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  open,
  mode,
  initialSupplier,
  canEditBank,
  defaultStoreName,
  debugMode,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<FormState>(() => toInitialState(mode, initialSupplier));
  const [scanInput, setScanInput] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const bizImgInputRef = useRef<HTMLInputElement>(null);
  const devImgInputRef = useRef<HTMLInputElement>(null);
  const cityBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const init = toInitialState(mode, initialSupplier);
    setForm(init);
    setCityQuery(
      init.city
        ? [init.province, init.city, init.district].filter(Boolean).join(' ')
        : ''
    );
    setScanInput('');
    setScanNote('');
    setError('');
  }, [open, mode, initialSupplier]);

  useEffect(() => {
    if (!cityDropdownOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (cityBoxRef.current && !cityBoxRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [cityDropdownOpen]);

  const filteredCities = useMemo(() => {
    const kw = cityQuery.trim().toLowerCase();
    if (!kw) return CITY_DIRECTORY;
    return CITY_DIRECTORY.filter((c) => c.label.toLowerCase().includes(kw));
  }, [cityQuery]);

  const handleScan = async () => {
    const code = scanInput.trim();
    if (!code) {
      setScanNote('请输入 UDI 码或 18 位统一社会信用代码后点击扫码');
      return;
    }
    setScanning(true);
    setScanNote('');
    try {
      const res = await suppliersApi.scanCode(code, debugMode);
      setForm((prev) => ({
        ...prev,
        ...(res.data.name && !prev.name ? { name: res.data.name } : {}),
        ...(res.data.alias && !prev.alias ? { alias: res.data.alias } : {}),
        ...(res.data.contact && !prev.contact ? { contact: res.data.contact } : {}),
        ...(res.data.phone && !prev.phone ? { phone: res.data.phone } : {}),
        ...(res.data.credit_code ? { credit_code: res.data.credit_code } : {}),
        ...(res.data.device_license_number ? { device_license_number: res.data.device_license_number } : {}),
        ...(res.data.province && !prev.province ? { province: res.data.province } : {}),
        ...(res.data.city && !prev.city ? { city: res.data.city } : {}),
        ...(res.data.district && !prev.district ? { district: res.data.district } : {}),
        ...(res.data.shipping_area_code && !prev.shipping_area_code
          ? { shipping_area_code: res.data.shipping_area_code }
          : {}),
        ...(res.data.detail_address && !prev.detail_address
          ? { detail_address: res.data.detail_address }
          : {}),
        ...(res.data.scope && !prev.scope ? { scope: res.data.scope } : {}),
      }));
      if (res.data.city) {
        setCityQuery(
          [res.data.province, res.data.city, res.data.district].filter(Boolean).join(' ')
        );
      }
      setScanNote(res.message);
    } catch (err) {
      setScanNote(err instanceof Error ? err.message : '识别失败');
    } finally {
      setScanning(false);
    }
  };

  const handleImagePick = async (
    file: File | undefined,
    field: 'business_license_image' | 'device_license_image'
  ) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setForm((prev) => ({ ...prev, [field]: dataUrl }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片处理失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedContact = form.contact.trim();
    const trimmedPhone = form.phone.trim();
    if (!trimmedName) {
      setError('请填写供应商名称');
      return;
    }
    if (!trimmedContact) {
      setError('请填写联系人');
      return;
    }
    if (!trimmedPhone) {
      setError('请填写联系电话');
      return;
    }

    const trimmedUsername = mode === 'create' ? (form.contact||form.name).trim() : form.login_username.trim();
    const trimmedPassword = mode === 'create' ? 'Admin@1234' : form.login_password.trim();
    if (mode === 'create' && trimmedUsername && !/^[\p{L}\p{N}·._ -]{1,64}$/u.test(trimmedUsername)) {
      setError('登录账号使用联系人真实姓名（最多64字）');
      return;
    }
    if (trimmedPassword && (trimmedPassword.length < 6 || trimmedPassword.length > 64)) {
      setError('登录密码长度需在 6 至 64 位之间');
      return;
    }

    const resolvedAlias = form.alias.trim() || trimmedName;
    const resolvedPinyin = form.alias_pinyin.trim() || toPinyinInitials(resolvedAlias);
    const parsedSort = Math.max(0, Math.min(100000, Number.parseInt(form.sort_order || '100', 10) || 100));
    const parsedCategories = form.categories
      .split(/[、,，/]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const payload: SupplierWritePayload = {
      name: trimmedName,
      alias: resolvedAlias,
      alias_pinyin: resolvedPinyin,
      contact: trimmedContact,
      phone: trimmedPhone,
      landline: form.landline.trim(),
      wechat: form.wechat.trim(),
      qq: form.qq.trim(),
      credit_code: form.credit_code.trim(),
      shipping_area_code: form.shipping_area_code.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      sort_order: parsedSort,
      detail_address: form.detail_address.trim(),
      scope: form.scope.trim().slice(0, 1000),
      business_license_image: form.business_license_image,
      business_license_expires_on: form.business_license_expires_on || null,
      device_license_image: form.device_license_image,
      device_license_expires_on: form.device_license_expires_on || null,
      device_license_number: form.device_license_number.trim(),
      device_license_issued_on: form.device_license_issued_on || null,
      device_license_issuer: form.device_license_issuer.trim(),
      device_license_valid_from: form.device_license_valid_from || null,
      enabled: form.enabled,
      is_supply_chain: form.is_supply_chain,
      is_default: form.is_default,
      remark: form.remark.trim().slice(0, 500),
      categories: parsedCategories,
      ...(mode === 'create'
        ? {
            owner_store_type: '总店',
            owner_store_name: defaultStoreName || '杭州西湖旗舰店',
            ...(trimmedUsername ? { login_username: trimmedUsername } : {}),
          }
        : {}),
      ...(trimmedPassword ? { login_password: trimmedPassword } : {}),
      ...(canEditBank
        ? {
            bank_holder: form.bank_holder.trim(),
            bank_branch: form.bank_branch.trim(),
            bank_account: form.bank_account.trim(),
          }
        : {}),
    };

    setSaving(true);
    setError('');
    try {
      const saved =
        mode === 'create'
          ? await suppliersApi.create(payload, debugMode)
          : await suppliersApi.update(initialSupplier!.id, payload, debugMode);
      onSaved(saved, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存供应商资料失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={mode === 'create' ? '新增 供应商资料' : `编辑 供应商资料 · ${initialSupplier?.name ?? ''}`}
      maxWidthClass="max-w-4xl"
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="accent" loading={saving} onClick={handleSubmit}>
            保存
          </Button>
        </>
      }
    >
      <form className="space-y-4 text-sm" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* 扫码填充 */}
        <div className="rounded-xl border border-[#E5E8E0] bg-[#FAFBF8] p-3">
          <div className="text-xs font-medium text-[#2D6A4F] mb-1.5">
            扫码填充供应商资料（UDI码 / 营业执照号）
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className={fieldInputClass + ' flex-1'}
              placeholder="扫描或输入 18 位统一社会信用代码 / 医疗器械经营许可证号"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleScan();
                }
              }}
            />
            <Button
              variant="accent"
              size="sm"
              loading={scanning}
              icon={<ScanLine className="w-3.5 h-3.5" />}
              onClick={() => void handleScan()}
            >
              扫码
            </Button>
          </div>
          {scanNote && <p className="mt-1.5 text-xs text-[#5F645D]">{scanNote}</p>}
        </div>

        {/* 基本信息 */}
        <SectionDivider title="基本信息" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">
              <span className="text-red-600">* </span>供应商名称
            </span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">
              <span className="text-red-600">* </span>联系人
            </span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.contact}
              onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">
              <span className="text-red-600">* </span>联系电话
            </span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">供应商别名</span>
            <input
              type="text"
              className={fieldInputClass}
              placeholder="若不填，则默认 供应商名称"
              value={form.alias}
              onChange={(e) => setForm((p) => ({ ...p, alias: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">别名拼音首字母</span>
            <input
              type="text"
              className={fieldInputClass}
              placeholder="默认为 别名 的拼音首字母"
              value={form.alias_pinyin}
              onChange={(e) => setForm((p) => ({ ...p, alias_pinyin: e.target.value.toUpperCase() }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">固定电话</span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.landline}
              onChange={(e) => setForm((p) => ({ ...p, landline: e.target.value }))}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">微信</span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.wechat}
              onChange={(e) => setForm((p) => ({ ...p, wechat: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">QQ号</span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.qq}
              onChange={(e) => setForm((p) => ({ ...p, qq: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">统一社会信用代码</span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.credit_code}
              onChange={(e) => setForm((p) => ({ ...p, credit_code: e.target.value }))}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">发货地址编号</span>
            <input
              type="text"
              className={fieldInputClass}
              placeholder="选城市后自动生成"
              value={form.shipping_area_code}
              onChange={(e) => setForm((p) => ({ ...p, shipping_area_code: e.target.value }))}
            />
          </label>

          <div ref={cityBoxRef} className="relative grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">城市</span>
            <input
              type="text"
              className={fieldInputClass}
              placeholder="可直接搜索 市或区"
              value={cityQuery}
              onFocus={() => setCityDropdownOpen(true)}
              onChange={(e) => {
                setCityQuery(e.target.value);
                setCityDropdownOpen(true);
              }}
            />
            {cityDropdownOpen && (
              <div className="absolute left-0 right-0 top-[62px] z-30 max-h-52 overflow-y-auto rounded-xl border border-[#D9DDD4] bg-white p-1 shadow-lg">
                {filteredCities.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[#73796F]">无匹配省市区</div>
                ) : (
                  filteredCities.map((entry) => (
                    <button
                      key={entry.key}
                      type="button"
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-[#171916] hover:bg-[#F5F7F2] flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        setForm((p) => ({
                          ...p,
                          province: entry.province,
                          city: entry.city,
                          district: entry.district,
                          shipping_area_code: entry.areaCode,
                        }));
                        setCityQuery(entry.label);
                        setCityDropdownOpen(false);
                      }}
                    >
                      <span>{entry.label}</span>
                      <span className="font-mono text-[11px] text-[#73796F]">{entry.areaCode}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">排序（越小的排在上面）</span>
            <input
              type="number"
              min={0}
              max={100000}
              className={fieldInputClass + ' tabular-nums'}
              value={form.sort_order}
              onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">详细地址</span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.detail_address}
              onChange={(e) => setForm((p) => ({ ...p, detail_address: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">供应品类（顿号分隔）</span>
            <input
              type="text"
              className={fieldInputClass}
              placeholder="如 镜片、镜架、护理液"
              value={form.categories}
              onChange={(e) => setForm((p) => ({ ...p, categories: e.target.value }))}
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-[#2D6A4F]">经营范围</span>
          <div className="relative">
            <textarea
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-[#D9DDD4] bg-white px-3 py-2 text-sm text-[#171916] outline-none focus:border-[#171916] focus:ring-2 focus:ring-[#171916]/[0.06]"
              value={form.scope}
              onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
            />
            <span className="mt-0.5 block text-right text-[11px] tabular-nums text-[#73796F]">
              {form.scope.length} / 1000
            </span>
          </div>
        </label>

        {/* 系统登录账号 */}
        <SectionDivider title="系统登录账号（同步至用户权限分配）" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-xl border border-[#E5E8E0] bg-[#FAFBF8] p-3.5">
          {mode === 'create' ? (
            <label className="grid gap-1">
              <span className="text-xs font-medium text-[#2D6A4F]">唯一登录账号 ID</span>
              <input
                type="text"
                className={fieldInputClass + ' font-mono'}
                placeholder="使用联系人真实姓名"
                readOnly
                value={form.contact||form.name}
                onChange={(e) => setForm((p) => ({ ...p, login_username: e.target.value }))}
              />
            </label>
          ) : (
            <div className="grid gap-1">
              <span className="text-xs font-medium text-[#2D6A4F]">唯一登录账号 ID</span>
              <div className="flex h-9 items-center justify-between rounded-lg border border-[#E5E8E0] bg-white px-3 text-sm">
                <span className="font-mono font-medium text-[#171916]">
                  @{form.login_username || '自动生成'}
                </span>
                <span className="text-[11px] text-[#73796F]">
                  {initialSupplier?.role_name || '合作供应商账号'}
                </span>
              </div>
            </div>
          )}
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">
              {mode === 'create' ? '初始登录密码' : '重置登录密码（可选）'}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              className={fieldInputClass}
              placeholder={mode === 'create' ? '统一初始密码 Admin@1234' : '留空则保持原密码不变'}
              readOnly={mode === 'create'}
              value={mode === 'create' ? 'Admin@1234' : form.login_password}
              onChange={(e) => setForm((p) => ({ ...p, login_password: e.target.value }))}
            />
          </label>
          <p className="sm:col-span-2 text-xs text-[#73796F]">
            供应商可使用该账号 ID 登录系统查看协同单据与自身商品，角色及菜单权限可在「系统管理 → 用户权限分配」中微调。
          </p>
        </div>

        {/* 银行资料 */}
        {canEditBank && (
          <>
            <SectionDivider title="银行资料" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-[#2D6A4F]">银行户名</span>
                <input
                  type="text"
                  className={fieldInputClass}
                  placeholder="如 深圳市****有限公司"
                  value={form.bank_holder}
                  onChange={(e) => setForm((p) => ({ ...p, bank_holder: e.target.value }))}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-[#2D6A4F]">开户行</span>
                <input
                  type="text"
                  className={fieldInputClass}
                  placeholder="如 中国建设银行XXX支行"
                  value={form.bank_branch}
                  onChange={(e) => setForm((p) => ({ ...p, bank_branch: e.target.value }))}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-[#2D6A4F]">银行账号</span>
                <input
                  type="text"
                  className={fieldInputClass + ' font-mono'}
                  value={form.bank_account}
                  onChange={(e) => setForm((p) => ({ ...p, bank_account: e.target.value }))}
                />
              </label>
            </div>
          </>
        )}

        {/* 营业执照 */}
        <SectionDivider title="营业执照" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 items-start">
          <div className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">营业执照</span>
            <input
              ref={bizImgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleImagePick(e.target.files?.[0], 'business_license_image');
                e.target.value = '';
              }}
            />
            {form.business_license_image ? (
              <div className="relative h-20 w-28 overflow-hidden rounded-lg border border-[#D9DDD4] bg-[#F8F9F5]">
                <img
                  src={form.business_license_image}
                  alt="营业执照"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="删除营业执照图片"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 cursor-pointer"
                  onClick={() => setForm((p) => ({ ...p, business_license_image: '' }))}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bizImgInputRef.current?.click()}
                className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#B8BEB2] bg-[#FAFBF8] text-xs text-[#5F645D] hover:border-[#2D6A4F] hover:text-[#2D6A4F] cursor-pointer"
              >
                <ImagePlus className="w-5 h-5" />
                <span>上传图片</span>
              </button>
            )}
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">营业执照过期时间</span>
            <input
              type="date"
              className={fieldInputClass}
              value={form.business_license_expires_on}
              onChange={(e) => setForm((p) => ({ ...p, business_license_expires_on: e.target.value }))}
            />
          </label>

          <div className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">医疗器械经营许可证</span>
            <input
              ref={devImgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleImagePick(e.target.files?.[0], 'device_license_image');
                e.target.value = '';
              }}
            />
            {form.device_license_image ? (
              <div className="relative h-20 w-28 overflow-hidden rounded-lg border border-[#D9DDD4] bg-[#F8F9F5]">
                <img
                  src={form.device_license_image}
                  alt="医疗器械经营许可证"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="删除医疗器械经营许可证图片"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 cursor-pointer"
                  onClick={() => setForm((p) => ({ ...p, device_license_image: '' }))}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => devImgInputRef.current?.click()}
                className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#B8BEB2] bg-[#FAFBF8] text-xs text-[#5F645D] hover:border-[#2D6A4F] hover:text-[#2D6A4F] cursor-pointer"
              >
                <ImagePlus className="w-5 h-5" />
                <span>上传图片</span>
              </button>
            )}
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">医疗器械经营许可证过期时间</span>
            <input
              type="date"
              className={fieldInputClass}
              value={form.device_license_expires_on}
              onChange={(e) => setForm((p) => ({ ...p, device_license_expires_on: e.target.value }))}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">医疗器械经营许可证号</span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.device_license_number}
              onChange={(e) => setForm((p) => ({ ...p, device_license_number: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">医疗器械经营许可证签发日期</span>
            <input
              type="date"
              className={fieldInputClass}
              value={form.device_license_issued_on}
              onChange={(e) => setForm((p) => ({ ...p, device_license_issued_on: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">医疗器械经营许可证签发机构</span>
            <input
              type="text"
              className={fieldInputClass}
              value={form.device_license_issuer}
              onChange={(e) => setForm((p) => ({ ...p, device_license_issuer: e.target.value }))}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-[#2D6A4F]">医疗器械经营许可证有效期开始时间,生效日期</span>
            <input
              type="date"
              className={fieldInputClass}
              value={form.device_license_valid_from}
              onChange={(e) => setForm((p) => ({ ...p, device_license_valid_from: e.target.value }))}
            />
          </label>
        </div>

        {/* 其他 */}
        <SectionDivider title="其他" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[#2D6A4F]">是否启用</span>
            <div className="flex items-center gap-5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="supplier_enabled"
                  checked={form.enabled}
                  onChange={() => setForm((p) => ({ ...p, enabled: true }))}
                />
                <span>启用</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="supplier_enabled"
                  checked={!form.enabled}
                  onChange={() => setForm((p) => ({ ...p, enabled: false }))}
                />
                <span>禁用</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2D6A4F]">
              <span>供应链供应商</span>
              <HelpTooltip
                title="供应链供应商说明"
                ariaLabel="供应链供应商说明"
                content="开启后，该供应商支持跨门店供应链协同交付与在途调拨。"
              />
            </span>
            <div className="flex items-center gap-5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="supplier_supply_chain"
                  checked={form.is_supply_chain}
                  onChange={() => setForm((p) => ({ ...p, is_supply_chain: true }))}
                />
                <span>启用</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="supplier_supply_chain"
                  checked={!form.is_supply_chain}
                  onChange={() => setForm((p) => ({ ...p, is_supply_chain: false }))}
                />
                <span>禁用</span>
              </label>
            </div>
          </div>
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-[#2D6A4F]">备注</span>
          <div>
            <textarea
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-[#D9DDD4] bg-white px-3 py-2 text-sm text-[#171916] outline-none focus:border-[#171916] focus:ring-2 focus:ring-[#171916]/[0.06]"
              value={form.remark}
              onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))}
            />
            <span className="mt-0.5 block text-right text-[11px] tabular-nums text-[#73796F]">
              {form.remark.length} / 500
            </span>
          </div>
        </label>
      </form>
    </Modal>
  );
};
