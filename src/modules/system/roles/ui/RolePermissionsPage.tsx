import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Lock, Save, Shield } from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import type { DataScopeType, RoleDefinition } from '@/src/modules/auth/domain/identity';
import { formatDateTime } from '@/src/shared/lib/format';
import { Button } from '@/src/shared/ui/Button';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

interface PermissionItemDef {
  code: string;
  label: string;
  isModuleEntry?: boolean;
  parentModuleCode?: string;
}

const PERMISSION_GROUPS: Array<{
  group: string;
  items: PermissionItemDef[];
}> = [
  {
    group: '工作台与基本资料',
    items: [
      { code: 'workbench.read', label: '访问系统工作台', isModuleEntry: true },
      { code: 'basic.read', label: '基本资料（一级模块）', isModuleEntry: true },
      { code: 'basic.product.read', label: '商品列表查看', parentModuleCode: 'basic.read' },
      { code: 'basic.product.create', label: '商品新增/复制', parentModuleCode: 'basic.read' },
      { code: 'basic.product.update', label: '商品编辑/批量设置', parentModuleCode: 'basic.read' },
      { code: 'basic.product.delete', label: '商品删除', parentModuleCode: 'basic.read' },
      { code: 'basic.product.import', label: '商品批量导入', parentModuleCode: 'basic.read' },
      { code: 'basic.product.export', label: '商品导出', parentModuleCode: 'basic.read' },
      { code: 'basic.product.cost.read', label: '进货价敏感字段查看', parentModuleCode: 'basic.read' },
      { code: 'basic.customer.read', label: '客户信息档案', parentModuleCode: 'basic.read' },
      { code: 'basic.staff.read', label: '职员与岗位档案', parentModuleCode: 'basic.read' },
      { code: 'basic.supplier.read', label: '供应商档案', parentModuleCode: 'basic.read' },
      { code: 'basic.brand.read', label: '品牌列表管理', parentModuleCode: 'basic.read' },
      { code: 'basic.fee.read', label: '费用项目字典', parentModuleCode: 'basic.read' },
    ],
  },
  {
    group: '销售、采购、调拨、库存与售后',
    items: [
      { code: 'sales.read', label: '销售管理（一级模块）', isModuleEntry: true },
      { code: 'sales.pos.create', label: '销售开单收银', parentModuleCode: 'sales.read' },
      { code: 'sales.order.read', label: '销售单据查询', parentModuleCode: 'sales.read' },
      { code: 'sales.discount.override', label: '低于8.5折超权折扣', parentModuleCode: 'sales.read' },
      { code: 'sales.settings.manage', label: '销售策略设置', parentModuleCode: 'sales.read' },
      { code: 'purchase.read', label: '采购管理（一级模块）', isModuleEntry: true },
      { code: 'purchase.create', label: '采购制单', parentModuleCode: 'purchase.read' },
      { code: 'purchase.approve', label: '采购审批', parentModuleCode: 'purchase.read' },
      { code: 'transfer.read', label: '调拨管理（一级模块）', isModuleEntry: true },
      { code: 'transfer.create', label: '发起门店调拨', parentModuleCode: 'transfer.read' },
      { code: 'inventory.read', label: '库存管理（一级模块）', isModuleEntry: true },
      { code: 'inventory.adjust.doc', label: '报损报溢/盘点制单', parentModuleCode: 'inventory.read' },
      { code: 'after_sales.read', label: '售后管理（一级模块）', isModuleEntry: true },
    ],
  },
  {
    group: '会员管理与精细化回访',
    items: [
      { code: 'members.read', label: '会员管理（一级模块）', isModuleEntry: true },
      { code: 'members.profile.read', label: '会员基本资料查看', parentModuleCode: 'members.read' },
      { code: 'members.profile.create', label: '会员新增/导入', parentModuleCode: 'members.read' },
      { code: 'members.followup.notification.read', label: '视力复查/取镜/过期提醒', parentModuleCode: 'members.read' },
      { code: 'members.followup.notification.send', label: '批量发送通知', parentModuleCode: 'members.read' },
      { code: 'members.points.read', label: '会员积分管理', parentModuleCode: 'members.read' },
      { code: 'members.recharge.read', label: '会员充值/退充', parentModuleCode: 'members.read' },
      { code: 'members.appointments.read', label: '预约到店管理', parentModuleCode: 'members.read' },
      { code: 'members.marketing.read', label: '老带新与转介绍', parentModuleCode: 'members.read' },
      { code: 'members.analytics.read', label: '会员RFM及数据分析', parentModuleCode: 'members.read' },
      { code: 'members.optometry.read', label: '会员验光档案查询', parentModuleCode: 'members.read' },
      { code: 'members.settings.manage', label: '会员等级/积分规则设置', parentModuleCode: 'members.read' },
    ],
  },
  {
    group: '视光、加工、隐形医疗器械、报表与财务',
    items: [
      { code: 'contact_lenses.read', label: '隐形眼镜管理（一级模块）', isModuleEntry: true },
      { code: 'processing.read', label: '加工中心（一级模块）', isModuleEntry: true },
      { code: 'vision_records.read', label: '视光档案（一级模块）', isModuleEntry: true },
      { code: 'vision_screening.read', label: '视力筛查（一级模块）', isModuleEntry: true },
      { code: 'orthokeratology.read', label: '角膜塑形管理（一级模块）', isModuleEntry: true },
      { code: 'reports.read', label: '报表中心（一级模块）', isModuleEntry: true },
      { code: 'finance.read', label: '财务管理（一级模块）', isModuleEntry: true },
      { code: 'finance.audit', label: '采购单财务审核与核销', parentModuleCode: 'finance.read' },
      { code: 'brands.read', label: '品牌专区（一级模块）', isModuleEntry: true },
      { code: 'brands.order.create', label: '品牌订货下单', parentModuleCode: 'brands.read' },
      { code: 'marketing.read', label: '营销推广（一级模块）', isModuleEntry: true },
    ],
  },
  {
    group: '系统管理、帮助中心与高敏操作',
    items: [
      { code: 'system.read', label: '系统管理（一级模块）', isModuleEntry: true },
      { code: 'system.role.manage', label: '角色权限管理（最高权限）', parentModuleCode: 'system.read' },
      { code: 'system.user.manage', label: '用户权限分配', parentModuleCode: 'system.read' },
      { code: 'system.store.manage', label: '门店与仓库资料', parentModuleCode: 'system.read' },
      { code: 'system.period_close.execute', label: '期末处理执行（高敏）', parentModuleCode: 'system.read' },
      { code: 'help.read', label: '帮助中心（一级模块）', isModuleEntry: true },
    ],
  },
];

export const RolePermissionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, allRoles, refetchRoles, hasPermission } = useAuth();
  const [selectedRoleId, setSelectedRoleId] = useState(allRoles[0]?.id ?? 'role_hq_admin');
  const [draftRole, setDraftRole] = useState<RoleDefinition | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const canManageRoles =
    session.identityType === 'admin' && hasPermission('system.role.manage');

  const { data: auditEntries = [] } = useQuery({
    queryKey: ['rbac', 'audits'],
    queryFn: () => appRepositories.roles.listAuditEntries(),
  });

  useEffect(() => {
    const found = allRoles.find((r) => r.id === selectedRoleId);
    if (found) {
      setDraftRole(structuredClone(found));
      setSavedBanner(null);
    }
  }, [selectedRoleId, allRoles]);

  const updateMutation = useMutation({
    mutationFn: (role: RoleDefinition) =>
      appRepositories.roles.updateRole(
        role,
        session.displayName,
        `更新角色「${role.name}」可操作功能配置（${role.permissions.length}项功能权，范围：${role.dataScope}）`
      ),
    onSuccess: (updated) => {
      setSavedBanner(
        `角色「${updated.name}」可操作功能与数据范围已更新，顶部导航及「全部菜单」已按新权限同步生效。`
      );
      refetchRoles();
      void queryClient.invalidateQueries({ queryKey: ['rbac'] });
    },
  });

  if (!draftRole) return null;

  const isLockedAdminPerm = (code: string) =>
    draftRole.id === 'role_hq_admin' &&
    (code === 'system.read' || code === 'system.role.manage');

  const togglePermission = (item: PermissionItemDef) => {
    if (!canManageRoles || isLockedAdminPerm(item.code)) return;

    setDraftRole((prev) => {
      if (!prev) return prev;
      const exists = prev.permissions.includes(item.code);
      let nextPerms = exists
        ? prev.permissions.filter((p) => p !== item.code)
        : [...prev.permissions, item.code];

      // Auto-cascade: enabling a sub-permission enables its parent module entry;
      // disabling a module entry removes its child sub-permissions.
      if (!exists && item.parentModuleCode && !nextPerms.includes(item.parentModuleCode)) {
        nextPerms = [...nextPerms, item.parentModuleCode];
      } else if (exists && item.isModuleEntry) {
        const childCodes = PERMISSION_GROUPS.flatMap((g) => g.items)
          .filter((i) => i.parentModuleCode === item.code && !isLockedAdminPerm(i.code))
          .map((i) => i.code);
        nextPerms = nextPerms.filter((p) => !childCodes.includes(p));
      }

      return {
        ...prev,
        permissions: Array.from(new Set(nextPerms)),
      };
    });
  };

  const toggleGroupAll = (items: PermissionItemDef[], selectAll: boolean) => {
    if (!canManageRoles) return;
    setDraftRole((prev) => {
      if (!prev) return prev;
      const groupCodes = items.map((i) => i.code);
      if (selectAll) {
        return {
          ...prev,
          permissions: Array.from(new Set([...prev.permissions, ...groupCodes])),
        };
      }
      return {
        ...prev,
        permissions: prev.permissions.filter(
          (code) => !groupCodes.includes(code) || isLockedAdminPerm(code)
        ),
      };
    });
  };

  return (
    <div className="space-y-6">
      {!canManageRoles && (
        <div className="p-4 rounded-2xl bg-[#FEF7EC] border border-[#FCD34D] text-[15px] text-[#B45309] flex items-center gap-2.5">
          <Lock className="w-4 h-4 shrink-0" />
          <span>仅总部最高管理员（admin）可编辑各角色的可操作功能与模块菜单权限。</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Role List */}
        <div className="lg:col-span-4 bg-white border border-[#D9DDD4] rounded-[20px] p-4 space-y-2">
          <div className="flex items-center gap-2 pb-3 mb-1 border-b border-[#E5E8E0]">
            <Shield className="w-4 h-4 text-[#171916]" />
            <h2 className="text-[17px] font-semibold text-[#171916]">角色列表</h2>
          </div>

          {allRoles.map((role) => {
            const active = role.id === selectedRoleId;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#ECF9A8] border-[#171916]'
                    : 'bg-[#F8F9F5] border-[#E5E8E0] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[16px] font-semibold text-[#171916]">{role.name}</span>
                  <StatusLabel
                    tone={
                      role.identityType === 'admin'
                        ? 'processing'
                        : role.identityType === 'supplier'
                          ? 'warning'
                          : 'success'
                    }
                    label={
                      role.identityType === 'admin'
                        ? '管理员'
                        : role.identityType === 'supplier'
                          ? '供应商'
                          : '门店'
                    }
                  />
                </div>
                <p className="mt-1.5 text-[14px] text-[#5F645D] line-clamp-2">{role.description}</p>
              </button>
            );
          })}
        </div>

        {/* Permission Tree + Data Scope + Sensitive Fields */}
        <div className="lg:col-span-8 space-y-5">
          {savedBanner && (
            <div className="p-3.5 rounded-xl bg-[#ECFDF3] border border-[#BBF7D0] text-[15px] text-[#166534] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedBanner}</span>
            </div>
          )}

          <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5E8E0]">
              <div>
                <h2 className="text-[19px] font-semibold text-[#171916]">
                  {draftRole.name} · 可操作功能与菜单权限配置
                </h2>
                <p className="text-[14px] text-[#5F645D] mt-0.5 tabular-nums">
                  已分配 {draftRole.permissions.length} 项可操作功能 · 最近修改：{draftRole.updatedBy}
                </p>
              </div>
              {canManageRoles && (
                <Button
                  variant="primary"
                  loading={updateMutation.isPending}
                  icon={<Save className="w-3.5 h-3.5" />}
                  onClick={() => updateMutation.mutate(draftRole)}
                >
                  保存角色权限
                </Button>
              )}
            </div>

            {/* Data Scope */}
            <div>
              <h3 className="text-[16px] font-semibold text-[#171916] mb-2">数据范围隔离策略</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[15px]">
                {[
                  { value: 'all_stores', label: '全部授权门店数据' },
                  { value: 'assigned_stores', label: '仅限绑定所属门店' },
                  { value: 'own_supplier', label: '仅限自身供应商商品与账款' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`p-3 rounded-xl border flex items-center gap-2 ${
                      canManageRoles ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                    } ${
                      draftRole.dataScope === opt.value
                        ? 'bg-[#F8F9F5] border-[#171916] font-medium'
                        : 'border-[#E5E8E0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dataScope"
                      disabled={!canManageRoles}
                      checked={draftRole.dataScope === opt.value}
                      onChange={() =>
                        setDraftRole({ ...draftRole, dataScope: opt.value as DataScopeType })
                      }
                      className="accent-[#171916]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sensitive Field Authorizations */}
            <div>
              <h3 className="text-[16px] font-semibold text-[#171916] mb-2">敏感字段与高敏操作授权</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-[14px]">
                {[
                  { key: 'viewCostPrice', label: '进货成本价' },
                  { key: 'viewWholesalePrice', label: '通用批发价' },
                  { key: 'viewProfitMargin', label: '销售毛利率' },
                  { key: 'viewPlaintextPhone', label: '顾客明文手机号' },
                  { key: 'batchExport', label: '数据批量导出' },
                ].map((field) => {
                  const k = field.key as keyof RoleDefinition['sensitiveFields'];
                  return (
                    <label
                      key={field.key}
                      className={`p-2.5 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] flex items-center gap-2 ${
                        canManageRoles ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!canManageRoles}
                        checked={draftRole.sensitiveFields[k]}
                        onChange={(e) =>
                          setDraftRole({
                            ...draftRole,
                            sensitiveFields: {
                              ...draftRole.sensitiveFields,
                              [k]: e.target.checked,
                            },
                          })
                        }
                        className="accent-[#171916]"
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Complete 18-Module & Operable Function Tree */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[16px] font-semibold text-[#171916]">
                  模块菜单与可操作功能树（勾选一级模块后将展示在对应角色的顶部与「全部菜单」中）
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERMISSION_GROUPS.map((grp) => {
                  const checkedCount = grp.items.filter((i) =>
                    draftRole.permissions.includes(i.code)
                  ).length;
                  const allSelected = checkedCount === grp.items.length;

                  return (
                    <div
                      key={grp.group}
                      className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#E5E8E0] space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E8E0]">
                        <div className="text-[15px] font-semibold text-[#171916]">
                          {grp.group}
                          <span className="ml-2 text-[12px] font-normal text-[#73796F] tabular-nums">
                            {checkedCount}/{grp.items.length}
                          </span>
                        </div>
                        {canManageRoles && (
                          <button
                            type="button"
                            onClick={() => toggleGroupAll(grp.items, !allSelected)}
                            className="text-[12px] font-medium text-[#171916] hover:underline cursor-pointer"
                          >
                            {allSelected ? '取消全选' : '全选本组'}
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        {grp.items.map((item) => {
                          const checked = draftRole.permissions.includes(item.code);
                          const locked = isLockedAdminPerm(item.code);
                          return (
                            <label
                              key={item.code}
                              className={`flex items-center justify-between gap-2 text-[14px] py-1 px-1.5 rounded-lg ${
                                !canManageRoles || locked
                                  ? 'cursor-not-allowed opacity-85'
                                  : 'cursor-pointer hover:bg-white/70'
                              }`}
                            >
                              <span className="flex items-center gap-2 text-[#171916] min-w-0">
                                <input
                                  type="checkbox"
                                  disabled={!canManageRoles || locked}
                                  checked={checked}
                                  onChange={() => togglePermission(item)}
                                  className="accent-[#171916] shrink-0"
                                />
                                <span
                                  className={`truncate ${
                                    item.isModuleEntry ? 'font-bold text-[#171916]' : 'text-[#5F645D]'
                                  }`}
                                >
                                  {item.label}
                                </span>
                                {locked && (
                                  <span className="text-[11px] text-[#73796F] shrink-0">
                                    (锁定保留)
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-[12px] text-[#73796F] shrink-0">
                                {item.code}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-3">
            <h3 className="text-[17px] font-semibold text-[#171916]">权限变更审计记录</h3>
            <div className="divide-y divide-[#E5E8E0]">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="py-3 text-[14px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#171916]">
                      {entry.roleName} · {entry.operator}
                    </span>
                    <span className="text-[#73796F] tabular-nums">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[#5F645D]">{entry.actionSummary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
