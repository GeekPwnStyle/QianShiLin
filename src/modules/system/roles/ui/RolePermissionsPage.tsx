import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Save, Shield } from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import type { DataScopeType, RoleDefinition } from '@/src/modules/auth/domain/identity';
import { formatDateTime } from '@/src/shared/lib/format';
import { Button } from '@/src/shared/ui/Button';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

const PERMISSION_GROUPS: Array<{
  group: string;
  items: Array<{ code: string; label: string }>;
}> = [
  {
    group: '工作台与基本资料',
    items: [
      { code: 'workbench.read', label: '访问系统工作台' },
      { code: 'basic.read', label: '基本资料模块可见' },
      { code: 'basic.product.read', label: '商品列表查看' },
      { code: 'basic.product.create', label: '商品新增/复制' },
      { code: 'basic.product.update', label: '商品编辑/批量设置' },
      { code: 'basic.product.delete', label: '商品删除' },
      { code: 'basic.product.import', label: '商品批量导入' },
      { code: 'basic.product.export', label: '商品导出' },
      { code: 'basic.product.cost.read', label: '进货价敏感字段查看' },
    ],
  },
  {
    group: '销售、采购、调拨与库存',
    items: [
      { code: 'sales.read', label: '销售管理模块' },
      { code: 'sales.pos.create', label: '销售开单' },
      { code: 'sales.discount.override', label: '低于8.5折超权折扣' },
      { code: 'purchase.read', label: '采购管理查看' },
      { code: 'purchase.approve', label: '采购审批' },
      { code: 'transfer.read', label: '调拨管理查看' },
      { code: 'inventory.read', label: '库存查询' },
      { code: 'inventory.adjust.doc', label: '报损报溢/盘点制单' },
    ],
  },
  {
    group: '会员与售后回访推送',
    items: [
      { code: 'members.read', label: '会员管理模块' },
      { code: 'members.profile.read', label: '会员基本资料查看' },
      { code: 'members.profile.create', label: '会员新增/导入' },
      { code: 'members.followup.notification.read', label: '视力复查/取镜/过期提醒查看' },
      { code: 'members.followup.notification.send', label: '批量发送演示通知' },
      { code: 'members.analytics.read', label: '会员RFM及数据分析' },
    ],
  },
  {
    group: '视光、加工、隐形医疗器械与财务',
    items: [
      { code: 'contact_lenses.read', label: '隐形眼镜三类器械合规管理' },
      { code: 'processing.read', label: '加工中心工单' },
      { code: 'vision_records.read', label: '视光档案管理' },
      { code: 'vision_screening.read', label: '校园视力筛查' },
      { code: 'orthokeratology.read', label: '角膜塑形镜管理' },
      { code: 'finance.read', label: '账款与往来对账' },
      { code: 'finance.audit', label: '采购单财务审核与核销' },
      { code: 'brands.read', label: '品牌专区' },
    ],
  },
  {
    group: '系统管理与高敏操作',
    items: [
      { code: 'system.read', label: '系统管理基础菜单' },
      { code: 'system.role.manage', label: '角色权限管理' },
      { code: 'system.user.manage', label: '用户权限分配' },
      { code: 'system.store.manage', label: '门店与仓库资料' },
      { code: 'system.period_close.execute', label: '期末处理执行（高敏）' },
    ],
  },
];

export const RolePermissionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, allRoles, refetchRoles } = useAuth();
  const [selectedRoleId, setSelectedRoleId] = useState(allRoles[0]?.id ?? 'role_hq_admin');
  const [draftRole, setDraftRole] = useState<RoleDefinition | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

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
        `更新角色「${role.name}」权限配置（${role.permissions.length}项功能权，范围：${role.dataScope}）`
      ),
    onSuccess: (updated) => {
      setSavedBanner(`角色「${updated.name}」权限与数据范围已更新并写入变更记录。`);
      refetchRoles();
      void queryClient.invalidateQueries({ queryKey: ['rbac'] });
    },
  });

  if (!draftRole) return null;

  const togglePermission = (code: string) => {
    setDraftRole((prev) => {
      if (!prev) return prev;
      const exists = prev.permissions.includes(code);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== code)
          : [...prev.permissions, code],
      };
    });
  };

  return (
    <div className="space-y-6">
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
                  {draftRole.name} · 权限配置矩阵
                </h2>
                <p className="text-[14px] text-[#5F645D] mt-0.5">
                  已勾选 {draftRole.permissions.length} 项权限编码 · 最近修改：{draftRole.updatedBy}
                </p>
              </div>
              <Button
                variant="primary"
                loading={updateMutation.isPending}
                icon={<Save className="w-3.5 h-3.5" />}
                onClick={() => updateMutation.mutate(draftRole)}
              >
                保存角色权限
              </Button>
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
                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 ${
                      draftRole.dataScope === opt.value
                        ? 'bg-[#F8F9F5] border-[#171916] font-medium'
                        : 'border-[#E5E8E0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dataScope"
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
                      className="p-2.5 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
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

            {/* Permission Tree */}
            <div className="space-y-4">
              <h3 className="text-[16px] font-semibold text-[#171916]">功能权限树</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERMISSION_GROUPS.map((grp) => (
                  <div
                    key={grp.group}
                    className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#E5E8E0] space-y-2.5"
                  >
                    <div className="text-[15px] font-semibold text-[#171916]">{grp.group}</div>
                    <div className="space-y-1.5">
                      {grp.items.map((item) => {
                        const checked = draftRole.permissions.includes(item.code);
                        return (
                          <label
                            key={item.code}
                            className="flex items-center justify-between gap-2 text-[14px] py-1 cursor-pointer"
                          >
                            <span className="flex items-center gap-2 text-[#171916]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(item.code)}
                                className="accent-[#171916]"
                              />
                              <span>{item.label}</span>
                            </span>
                            <span className="font-mono text-[12px] text-[#73796F]">{item.code}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
