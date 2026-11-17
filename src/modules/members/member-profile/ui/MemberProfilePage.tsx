import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, Plus, Search } from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import type { MemberProfile, MemberTier } from '@/src/modules/members/member-profile/domain/member';
import { formatCurrency, maskPhone } from '@/src/shared/lib/format';
import { Button } from '@/src/shared/ui/Button';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { Modal } from '@/src/shared/ui/Modal';
import { Select } from '@/src/shared/ui/Select';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/src/shared/ui/StateViews';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

const createMemberSchema = z.object({
  name: z.string().min(2, '请输入会员姓名'),
  gender: z.enum(['男', '女']),
  age: z.number().int().min(1).max(120),
  phone: z.string().regex(/^1\d{10}$/, '请输入11位有效手机号'),
  tier: z.enum(['银卡会员', '金卡会员', '黑卡会员', '青少年护眼会员']),
  storeId: z.string().min(1),
  guideName: z.string().min(1, '请输入专属导购'),
});

type CreateMemberValues = z.infer<typeof createMemberSchema>;

export const MemberProfilePage: React.FC<{ defaultOpenCreate?: boolean }> = ({
  defaultOpenCreate = false,
}) => {
  const queryClient = useQueryClient();
  const { session, currentRole, dataScope, hasPermission } = useAuth();
  const allowPlainPhone = Boolean(currentRole?.sensitiveFields.viewPlaintextPhone);
  const canCreate = hasPermission('members.profile.create');

  const [keyword, setKeyword] = useState('');
  const [tierFilter, setTierFilter] = useState<MemberTier | 'all'>('all');
  const [applied, setApplied] = useState({ keyword: '', tier: 'all' as MemberTier | 'all' });
  const [page, setPage] = useState(1);

  const [detailMember, setDetailMember] = useState<MemberProfile | null>(null);
  const [detailTab, setDetailTab] = useState<'basic' | 'consumption' | 'wallet' | 'appointments' | 'vision'>('basic');
  const [createOpen, setCreateOpen] = useState(defaultOpenCreate);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['members', applied, page, session.roleId, session.currentStoreId],
    queryFn: () =>
      appRepositories.members.queryMembers(
        { page, pageSize: 8, filters: applied },
        dataScope
      ),
  });

  const form = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      name: '',
      gender: '女',
      age: 26,
      phone: '',
      tier: '金卡会员',
      storeId: session.currentStoreId === 'all' ? 'store_hq_01' : session.currentStoreId,
      guideName: '苏晓晴',
    },
  });

  const createMutation = useMutation({
    mutationFn: (v: CreateMemberValues) => {
      const storeName =
        STORE_CATALOG.find((s) => s.id === v.storeId)?.name ?? '杭州西湖旗舰店';
      return appRepositories.members.createMember(
        { ...v, storeName, tags: ['门店新建'] },
        dataScope
      );
    },
    onSuccess: () => {
      setCreateOpen(false);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const columns: TableColumn<MemberProfile>[] = [
    {
      key: 'name',
      header: '会员姓名',
      sticky: true,
      render: (m) => (
        <div>
          <div className="font-medium text-[#171916]">{m.name}</div>
          <div className="text-[13px] font-mono text-[#73796F]">{m.memberNo}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: '手机号',
      render: (m) => (
        <span className="font-mono text-[14px] text-[#5F645D]">
          {maskPhone(m.phone, allowPlainPhone)}
        </span>
      ),
    },
    {
      key: 'tier',
      header: '会员等级',
      render: (m) => (
        <StatusLabel
          tone={m.tier === '黑卡会员' ? 'accent' : m.tier === '青少年护眼会员' ? 'processing' : 'neutral'}
          label={m.tier}
        />
      ),
    },
    { key: 'storeName', header: '归属门店', render: (m) => m.storeName },
    { key: 'guideName', header: '专属导购', render: (m) => m.guideName },
    {
      key: 'pointsBalance',
      header: '可用积分',
      align: 'right',
      render: (m) => m.pointsBalance.toLocaleString('zh-CN'),
    },
    {
      key: 'storedValueBalance',
      header: '储值余额',
      align: 'right',
      render: (m) => formatCurrency(m.storedValueBalance),
    },
    {
      key: 'totalSpent',
      header: '累计消费',
      align: 'right',
      render: (m) => formatCurrency(m.totalSpent),
    },
    {
      key: 'nextReviewDate',
      header: '下次建议复查',
      render: (m) => <span className="tabular-nums">{m.nextReviewDate}</span>,
    },
    {
      key: 'actions',
      header: '操作',
      render: (m) => (
        <button
          type="button"
          onClick={() => {
            setDetailMember(m);
            setDetailTab('basic');
          }}
          className="text-[14px] font-medium text-[#171916] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>档案详情</span>
        </button>
      ),
    },
  ];

  const rows = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="会员姓名 / 编号 / 手机号"
              className="w-full h-10 pl-9 pr-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] outline-none focus:border-[#171916]"
            />
          </div>
          <Select
            ariaLabel="筛选会员等级"
            value={tierFilter}
            onChange={(val) => setTierFilter(val as MemberTier | 'all')}
            className="w-44"
            options={[
              { value: 'all', label: '全部等级' },
              { value: '银卡会员', label: '银卡会员' },
              { value: '金卡会员', label: '金卡会员' },
              { value: '黑卡会员', label: '黑卡会员' },
              { value: '青少年护眼会员', label: '青少年护眼会员' },
            ]}
          />
          <Button
            variant="primary"
            onClick={() => {
              setPage(1);
              setApplied({ keyword, tier: tierFilter });
            }}
          >
            查询
          </Button>
        </div>

        {canCreate && (
          <Button
            variant="accent"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setCreateOpen(true)}
          >
            新增会员
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState mode="filtered" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          total={data?.total ?? 0}
          page={page}
          pageSize={8}
          onPageChange={setPage}
        />
      )}

      {/* Rich Member Detail Modal */}
      <Modal
        open={Boolean(detailMember)}
        onClose={() => setDetailMember(null)}
        title={`会员全景档案 · ${detailMember?.name ?? ''}`}
        subtitle={`${detailMember?.memberNo ?? ''} · ${detailMember?.storeName ?? ''} · ${detailMember?.tier ?? ''}`}
        maxWidthClass="max-w-3xl"
        footer={
          <Button variant="secondary" onClick={() => setDetailMember(null)}>
            关闭
          </Button>
        }
      >
        {detailMember && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 border-b border-[#E5E8E0] pb-3">
              {[
                { id: 'basic', label: '基本资料' },
                { id: 'consumption', label: `消费记录 (${detailMember.consumptions.length})` },
                { id: 'wallet', label: '积分与储值' },
                { id: 'appointments', label: '预约与回访' },
                { id: 'vision', label: `关联视光记录 (${detailMember.visionRecords.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDetailTab(t.id as typeof detailTab)}
                  className={`h-9 px-3.5 rounded-full text-[14px] font-medium cursor-pointer ${
                    detailTab === t.id
                      ? 'bg-[#171916] text-white'
                      : 'bg-[#F8F9F5] text-[#5F645D] border border-[#D9DDD4]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {detailTab === 'basic' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[15px]">
                <div>
                  <div className="text-[14px] text-[#73796F]">姓名 / 性别 / 年龄</div>
                  <div className="mt-1 font-medium">
                    {detailMember.name} · {detailMember.gender} · {detailMember.age}岁
                  </div>
                </div>
                <div>
                  <div className="text-[14px] text-[#73796F]">联系手机</div>
                  <div className="mt-1 font-mono">{maskPhone(detailMember.phone, allowPlainPhone)}</div>
                </div>
                <div>
                  <div className="text-[14px] text-[#73796F]">专属导购</div>
                  <div className="mt-1">{detailMember.guideName}</div>
                </div>
                <div>
                  <div className="text-[14px] text-[#73796F]">最近到店</div>
                  <div className="mt-1 tabular-nums">{detailMember.lastVisitDate}</div>
                </div>
                <div>
                  <div className="text-[14px] text-[#73796F]">计划复查</div>
                  <div className="mt-1 tabular-nums font-medium">{detailMember.nextReviewDate}</div>
                </div>
                <div>
                  <div className="text-[14px] text-[#73796F]">标签特征</div>
                  <div className="mt-1 text-[#5F645D]">{detailMember.tags.join(' · ')}</div>
                </div>
              </div>
            )}

            {detailTab === 'consumption' && (
              <div className="space-y-2.5">
                {detailMember.consumptions.length === 0 ? (
                  <p className="text-[15px] text-[#5F645D] py-6 text-center">暂无消费记录</p>
                ) : (
                  detailMember.consumptions.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] flex items-center justify-between gap-3 text-[15px]"
                    >
                      <div>
                        <div className="font-medium text-[#171916]">{c.itemsSummary}</div>
                        <div className="text-[14px] text-[#73796F] mt-0.5">
                          {c.orderNo} · {c.date} · {c.storeName} · 导购 {c.guideName}
                        </div>
                      </div>
                      <div className="font-semibold tabular-nums">{formatCurrency(c.amount)}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'wallet' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)]">
                  <div className="text-[14px]">当前可用积分</div>
                  <div className="text-[30px] font-semibold tabular-nums mt-1">
                    {detailMember.pointsBalance.toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#D9DDD4]">
                  <div className="text-[14px] text-[#5F645D]">储值账户余额</div>
                  <div className="text-[26px] font-semibold tabular-nums mt-1">
                    {formatCurrency(detailMember.storedValueBalance)}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#D9DDD4]">
                  <div className="text-[14px] text-[#5F645D]">历史累计消费</div>
                  <div className="text-[26px] font-semibold tabular-nums mt-1">
                    {formatCurrency(detailMember.totalSpent)}
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'appointments' && (
              <div className="space-y-4 text-[15px]">
                <div>
                  <div className="font-semibold text-[#171916] mb-2">门店预约记录</div>
                  {detailMember.appointments.length === 0 ? (
                    <p className="text-[#73796F]">暂无预约</p>
                  ) : (
                    detailMember.appointments.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] flex justify-between"
                      >
                        <span>
                          {a.date} · {a.type}
                        </span>
                        <span className="font-medium">{a.status}</span>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div className="font-semibold text-[#171916] mb-2">售后回访记录</div>
                  {detailMember.followupLogs.length === 0 ? (
                    <p className="text-[#73796F]">暂无回访记录</p>
                  ) : (
                    detailMember.followupLogs.map((l) => (
                      <div key={l.id} className="p-3 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0]">
                        <div className="text-[14px] text-[#73796F]">
                          {l.date} · {l.channel}
                        </div>
                        <div className="mt-1">{l.summary}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {detailTab === 'vision' && (
              <div className="space-y-3">
                {detailMember.visionRecords.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#D9DDD4] space-y-3 text-[15px]"
                  >
                    <div className="flex justify-between text-[14px] text-[#5F645D]">
                      <span>验光日期：{v.examDate}</span>
                      <span>主检：{v.optometrist}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[14px]">
                      <div className="p-3 rounded-xl bg-white border border-[#E5E8E0]">
                        <div className="font-sans font-semibold text-[#171916] mb-1">右眼 (OD)</div>
                        <div>球镜 {v.odSph} · 柱镜 {v.odCyl} · 轴位 {v.odAxis}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-[#E5E8E0]">
                        <div className="font-sans font-semibold text-[#171916] mb-1">左眼 (OS)</div>
                        <div>球镜 {v.osSph} · 柱镜 {v.osCyl} · 轴位 {v.osAxis}</div>
                      </div>
                    </div>
                    <div className="text-[14px] text-[#5F645D]">
                      瞳距 PD：{v.pdMm} · 临床备注：{v.note}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Member Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新建会员档案"
        maxWidthClass="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              loading={createMutation.isPending}
              onClick={() => form.handleSubmit((v) => createMutation.mutate(v))()}
            >
              提交建档
            </Button>
          </>
        }
      >
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[15px]">
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">姓名 *</label>
            <input {...form.register('name')} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]" />
            {form.formState.errors.name && (
              <p className="text-[13px] text-[#DC2626] mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">手机号 *</label>
            <input {...form.register('phone')} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]" />
            {form.formState.errors.phone && (
              <p className="text-[13px] text-[#DC2626] mt-1">{form.formState.errors.phone.message}</p>
            )}
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">性别</label>
            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <Select
                  ariaLabel="性别"
                  variant="white"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: '女', label: '女' },
                    { value: '男', label: '男' },
                  ]}
                />
              )}
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">年龄</label>
            <input
              type="number"
              {...form.register('age', { valueAsNumber: true })}
              className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]"
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">会员等级</label>
            <Controller
              control={form.control}
              name="tier"
              render={({ field }) => (
                <Select
                  ariaLabel="会员等级"
                  variant="white"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: '银卡会员', label: '银卡会员' },
                    { value: '金卡会员', label: '金卡会员' },
                    { value: '黑卡会员', label: '黑卡会员' },
                    { value: '青少年护眼会员', label: '青少年护眼会员' },
                  ]}
                />
              )}
            />
          </div>
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">归属门店</label>
            <Controller
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <Select
                  ariaLabel="归属门店"
                  variant="white"
                  value={field.value}
                  onChange={field.onChange}
                  options={STORE_CATALOG.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              )}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[14px] text-[#5F645D] mb-1">专属导购</label>
            <input {...form.register('guideName')} className="w-full h-10 px-3 rounded-[9px] border border-[#D9DDD4]" />
          </div>
        </form>
      </Modal>
    </div>
  );
};
