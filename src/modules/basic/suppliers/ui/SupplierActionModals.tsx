import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import { productsApi } from '@/src/modules/basic/products/infrastructure/productsApi';
import {
  FRANCHISE_WHOLESALE_OPTIONS,
  suppliersApi,
  type SupplierRecord,
} from '@/src/modules/basic/suppliers/infrastructure/suppliersApi';
import { Button } from '@/src/shared/ui/Button';
import { Modal } from '@/src/shared/ui/Modal';
import { Select } from '@/src/shared/ui/Select';

/* ---------- 1. 通过邀请码新增弹窗 ---------- */
export const SupplierInvitationModal: React.FC<{
  open: boolean;
  debugMode: boolean;
  onClose: () => void;
  onSupplierAdded: () => void;
}> = ({ open, debugMode, onClose, onSupplierAdded }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const invitationsQuery = useQuery({
    queryKey: ['supplier-invitations', debugMode],
    enabled: open,
    queryFn: () => suppliersApi.listInvitations(debugMode),
  });

  useEffect(() => {
    if (!open) return;
    setInviteCode('');
    setError('');
    setNotice('');
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inviteCode.trim();
    if (!clean) {
      setError('请输入邀请码');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const res = await suppliersApi.createInvitation(clean, debugMode);
      setInviteCode('');
      await invitationsQuery.refetch();
      if (res.autoApproved) {
        setNotice(`邀请码「${clean}」已核验通过并自动创建供应商档案！`);
        onSupplierAdded();
      } else {
        setNotice(`已提交邀请码「${clean}」绑定申请，当前状态：待审核`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交邀请码失败');
    } finally {
      setSubmitting(false);
    }
  };

  const rows = invitationsQuery.data ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="通过邀请码新增"
      maxWidthClass="max-w-4xl"
      footer={<Button onClick={onClose}>关闭</Button>}
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-[#B7E4C7] bg-[#ECFDF5] p-3.5 text-xs leading-relaxed text-[#1B4332]">
          <div className="font-semibold">【功能介绍】：</div>
          <p>1、此功能为通过邀请码的方式，快速将其他协作门店或供应链伙伴绑定为本店的供应商。</p>
          <p>2、绑定后，本店可在采购单与在途商品中查看该供应商开出的加盟批发出货单，方便直接转为采购入库。</p>
          <div className="mt-2 font-semibold">【绑定说明】：</div>
          <p>1、下方输入对方门店提供的邀请码并点击确定，等待对方门店审核（测试快捷直通码示例：QSL-SUP-8899）。</p>
          <p>2、对方门店审核通过后，会自动把对方门店创建为供应商并同步到供应商资料。</p>
          <p>3、对方门店审核不通过，拒绝原因将在下方表格展示。</p>
        </div>

        <form className="space-y-1.5" onSubmit={handleSubmit}>
          <label className="block text-xs font-medium text-[#2D6A4F]">
            <span className="text-red-600">* </span>输入邀请码
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="h-9 w-72 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none focus:border-[#171916]"
              placeholder="请输入对方门店邀请码（如 QSL-SUP-8899）"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <Button variant="accent" size="sm" loading={submitting} type="submit">
              确定
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {notice && <p className="text-xs text-[#2D6A4F]">{notice}</p>}
        </form>

        <div className="overflow-hidden rounded-xl border border-[#E5E8E0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7F2] text-[#4A4F47]">
              <tr>
                <th className="p-2.5">状态</th>
                <th className="p-2.5">邀请码</th>
                <th className="p-2.5">审核门店名称</th>
                <th className="p-2.5">审核门店联系人</th>
                <th className="p-2.5">申请日期</th>
                <th className="p-2.5">说明</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#9AA096]">
                    暂无数据
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#ECEFE7]">
                    <td className="p-2.5 font-medium">{r.status}</td>
                    <td className="p-2.5 font-mono">{r.invite_code}</td>
                    <td className="p-2.5">{r.target_store_name}</td>
                    <td className="p-2.5">{r.target_store_contact}</td>
                    <td className="p-2.5 tabular-nums">{r.applied_at}</td>
                    <td className="p-2.5 text-[#5F645D]">{r.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

/* ---------- 2. 行「更多」弹窗（授权查看 / 绑定商品 / 绑定第三方 / 绑定授权门店） ---------- */
type MoreTab = 'menu' | 'auth_view' | 'bind_products' | 'bind_third_party' | 'bind_stores';

export const SupplierMoreModal: React.FC<{
  supplier: SupplierRecord | null;
  canEdit: boolean;
  debugMode: boolean;
  onClose: () => void;
  onUpdated: () => void;
}> = ({ supplier, canEdit, debugMode, onClose, onUpdated }) => {
  const [tab, setTab] = useState<MoreTab>('menu');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [thirdPartyPlatform, setThirdPartyPlatform] = useState('');
  const [thirdPartyCode, setThirdPartyCode] = useState('');
  const [thirdPartyRemark, setThirdPartyRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const productsQuery = useQuery({
    queryKey: ['supplier-bind-products', debugMode],
    enabled: Boolean(supplier) && tab === 'bind_products',
    queryFn: () => productsApi.listProducts({ page: 1, pageSize: 100 }, debugMode),
  });

  useEffect(() => {
    if (!supplier) return;
    setTab('menu');
    setSelectedStores(supplier.authorized_store_ids ?? []);
    setSelectedFranchise(supplier.bound_franchise_stores ?? []);
    setSelectedProducts(supplier.bound_product_ids ?? []);
    setThirdPartyPlatform(supplier.third_party_binding?.platform ?? '');
    setThirdPartyCode(supplier.third_party_binding?.externalSupplierId ?? '');
    setThirdPartyRemark(supplier.third_party_binding?.remark ?? '');
    setNotice('');
  }, [supplier]);

  if (!supplier) return null;

  const storeNames = (supplier.authorized_store_ids ?? [])
    .map((id) => STORE_CATALOG.find((s) => s.id === id)?.name ?? id)
    .join('、');

  const savePartial = async (payload: Record<string, unknown>, msg: string) => {
    setSaving(true);
    setNotice('');
    try {
      await suppliersApi.update(supplier.id, payload, debugMode);
      setNotice(msg);
      onUpdated();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(supplier)}
      onClose={onClose}
      title={tab === 'menu' ? '更多' : `更多 · ${supplier.name}`}
      maxWidthClass={tab === 'menu' ? 'max-w-lg' : 'max-w-2xl'}
      footer={
        <div className="flex items-center gap-2">
          {tab !== 'menu' && (
            <Button onClick={() => setTab('menu')} disabled={saving}>
              返回功能菜单
            </Button>
          )}
          <Button onClick={onClose} disabled={saving}>
            关闭
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2.5">
          <Button variant={tab === 'auth_view' ? 'primary' : 'accent'} onClick={() => setTab('auth_view')}>
            授权查看
          </Button>
          <Button variant={tab === 'bind_products' ? 'primary' : 'accent'} onClick={() => setTab('bind_products')}>
            绑定商品
          </Button>
          <Button variant={tab === 'bind_third_party' ? 'primary' : 'accent'} onClick={() => setTab('bind_third_party')}>
            绑定第三方
          </Button>
          <Button variant={tab === 'bind_stores' ? 'primary' : 'accent'} onClick={() => setTab('bind_stores')}>
            绑定授权门店
          </Button>
        </div>

        {notice && (
          <div className="rounded-xl border border-[#B7E4C7] bg-[#ECFDF5] px-3 py-2 text-xs text-[#1B4332]">
            {notice}
          </div>
        )}

        {tab === 'auth_view' && (
          <div className="space-y-2.5 rounded-xl border border-[#E5E8E0] bg-[#FAFBF8] p-4 text-xs">
            <div>
              <span className="text-[#6D736A]">供应商：</span>
              <strong className="text-[#171916]">{supplier.name}</strong>
            </div>
            <div>
              <span className="text-[#6D736A]">归属门店：</span>
              <span>{supplier.owner_store_type || '总店'} · {supplier.owner_store_name || '杭州西湖旗舰店'}</span>
            </div>
            <div>
              <span className="text-[#6D736A]">已授权门店：</span>
              <span>{storeNames || '暂未授权门店'}</span>
            </div>
            <div>
              <span className="text-[#6D736A]">绑定加盟批发门店：</span>
              <span>{supplier.bound_franchise_stores?.join('、') || '暂无绑定'}</span>
            </div>
            <div>
              <span className="text-[#6D736A]">已绑定商品数：</span>
              <span className="tabular-nums">{supplier.bound_product_ids?.length ?? 0} 个</span>
            </div>
            <div>
              <span className="text-[#6D736A]">第三方平台对接：</span>
              <span>
                {supplier.third_party_binding?.platform
                  ? `${supplier.third_party_binding.platform}（${supplier.third_party_binding.externalSupplierId || '无编码'}）`
                  : '未绑定'}
              </span>
            </div>
          </div>
        )}

        {tab === 'bind_stores' && (
          <div className="space-y-3 rounded-xl border border-[#E5E8E0] bg-[#FAFBF8] p-4">
            <div className="text-xs font-semibold text-[#171916]">选择授权可用门店</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STORE_CATALOG.map((st) => (
                <label key={st.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={selectedStores.includes(st.id)}
                    onChange={(e) =>
                      setSelectedStores((prev) =>
                        e.target.checked ? [...prev, st.id] : prev.filter((x) => x !== st.id)
                      )
                    }
                  />
                  <span>{st.name}</span>
                </label>
              ))}
            </div>
            <div className="pt-2 border-t border-[#E5E8E0] text-xs font-semibold text-[#171916]">
              绑定加盟批发门店
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FRANCHISE_WHOLESALE_OPTIONS.map((name) => (
                <label key={name} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={selectedFranchise.includes(name)}
                    onChange={(e) =>
                      setSelectedFranchise((prev) =>
                        e.target.checked ? [...prev, name] : prev.filter((x) => x !== name)
                      )
                    }
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
            {canEdit && (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="accent"
                  size="sm"
                  loading={saving}
                  onClick={() =>
                    void savePartial(
                      {
                        authorized_store_ids: selectedStores,
                        bound_franchise_stores: selectedFranchise,
                      },
                      '已保存门店授权与加盟批发门店绑定'
                    )
                  }
                >
                  保存绑定
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === 'bind_products' && (
          <div className="space-y-3 rounded-xl border border-[#E5E8E0] bg-[#FAFBF8] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#171916]">勾选绑定该供应商直供商品</span>
              <span className="text-[#6D736A]">已选 {selectedProducts.length} 个商品</span>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-lg border border-[#E5E8E0] bg-white p-2.5">
              {(productsQuery.data?.items ?? []).length === 0 ? (
                <div className="py-6 text-center text-xs text-[#73796F]">
                  {productsQuery.isLoading ? '正在加载商品目录…' : '暂无可选商品'}
                </div>
              ) : (
                (productsQuery.data?.items ?? []).map((p) => (
                  <label key={p.id} className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-[#F5F7F2] cursor-pointer">
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={selectedProducts.includes(p.id)}
                        onChange={(e) =>
                          setSelectedProducts((prev) =>
                            e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                          )
                        }
                      />
                      <span className="truncate font-medium text-[#171916]">{p.name}</span>
                    </span>
                    <span className="shrink-0 text-[#73796F]">{p.brandName} · {p.categoryName}</span>
                  </label>
                ))
              )}
            </div>
            {canEdit && (
              <div className="flex justify-end">
                <Button
                  variant="accent"
                  size="sm"
                  loading={saving}
                  onClick={() =>
                    void savePartial({ bound_product_ids: selectedProducts }, '已保存供应商绑定商品')
                  }
                >
                  保存商品绑定
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === 'bind_third_party' && (
          <div className="space-y-3 rounded-xl border border-[#E5E8E0] bg-[#FAFBF8] p-4">
            <label className="grid gap-1 text-xs">
              <span className="font-medium text-[#4A4F47]">第三方平台名称</span>
              <input
                type="text"
                disabled={!canEdit}
                className="h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none"
                placeholder="如 蔡司官网下单平台 / 依视路EDI通道"
                value={thirdPartyPlatform}
                onChange={(e) => setThirdPartyPlatform(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="font-medium text-[#4A4F47]">第三方平台商户编码</span>
              <input
                type="text"
                disabled={!canEdit}
                className="h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm font-mono outline-none"
                placeholder="如 EXT-ZEISS-001"
                value={thirdPartyCode}
                onChange={(e) => setThirdPartyCode(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              <span className="font-medium text-[#4A4F47]">对接备注</span>
              <input
                type="text"
                disabled={!canEdit}
                className="h-9 rounded-lg border border-[#D9DDD4] bg-white px-3 text-sm outline-none"
                value={thirdPartyRemark}
                onChange={(e) => setThirdPartyRemark(e.target.value)}
              />
            </label>
            {canEdit && (
              <div className="flex justify-end">
                <Button
                  variant="accent"
                  size="sm"
                  loading={saving}
                  onClick={() =>
                    void savePartial(
                      {
                        third_party_binding: {
                          platform: thirdPartyPlatform.trim(),
                          externalSupplierId: thirdPartyCode.trim(),
                          remark: thirdPartyRemark.trim(),
                        },
                      },
                      '已保存第三方平台绑定'
                    )
                  }
                >
                  保存第三方绑定
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

/* ---------- 3. 批量授权门店弹窗 ---------- */
export const BatchAuthorizeModal: React.FC<{
  open: boolean;
  selectedSuppliers: SupplierRecord[];
  debugMode: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}> = ({ open, selectedSuppliers, debugMode, onClose, onSuccess }) => {
  const [storeIds, setStoreIds] = useState<string[]>(STORE_CATALOG.map((s) => s.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
  }, [open]);

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      const count = await suppliersApi.batchAuthorize(
        selectedSuppliers.map((s) => s.id),
        storeIds,
        debugMode
      );
      onSuccess(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量授权失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="批量授权门店"
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="accent" loading={saving} onClick={() => void handleConfirm()}>
            确认授权
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-xs text-[#5F645D]">
          将为选中的 <strong>{selectedSuppliers.length}</strong> 家供应商统一设置可采购与查看的门店范围：
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="space-y-2 rounded-xl border border-[#E5E8E0] bg-[#FAFBF8] p-3">
          {STORE_CATALOG.map((st) => (
            <label key={st.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={storeIds.includes(st.id)}
                onChange={(e) =>
                  setStoreIds((prev) =>
                    e.target.checked ? [...prev, st.id] : prev.filter((x) => x !== st.id)
                  )
                }
              />
              <span>{st.name}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
};

/* ---------- 4. 合并供应商弹窗 ---------- */
export const MergeSuppliersModal: React.FC<{
  open: boolean;
  selectedSuppliers: SupplierRecord[];
  debugMode: boolean;
  onClose: () => void;
  onSuccess: (mergedCount: number) => void;
}> = ({ open, selectedSuppliers, debugMode, onClose, onSuccess }) => {
  const [targetId, setTargetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTargetId(selectedSuppliers[0]?.id ?? '');
    setError('');
  }, [open, selectedSuppliers]);

  const handleMerge = async () => {
    if (!targetId) {
      setError('请选择合并后主保留的供应商');
      return;
    }
    const sourceIds = selectedSuppliers.map((s) => s.id).filter((id) => id !== targetId);
    setSaving(true);
    setError('');
    try {
      const merged = await suppliersApi.merge(sourceIds, targetId, debugMode);
      onSuccess(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : '合并供应商失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="合并供应商"
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="accent" loading={saving} onClick={() => void handleMerge()}>
            确认合并
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-xs text-[#5F645D]">
          将选中的 <strong>{selectedSuppliers.length}</strong> 家供应商的采购单、入库单、商品关联及授权门店合并至同一主档案，合并后其余重复档案将被清理。
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-[#4A4F47]">选择主保留供应商 *</span>
          <Select
            variant="arc"
            ariaLabel="主保留供应商"
            placeholder="请选择主保留供应商"
            value={targetId}
            onChange={setTargetId}
            options={selectedSuppliers.map((s) => ({
              value: s.id,
              label: s.name,
              description: `${s.contact || '无联系人'} · ${s.phone || '无电话'}`,
            }))}
          />
        </div>
      </div>
    </Modal>
  );
};
