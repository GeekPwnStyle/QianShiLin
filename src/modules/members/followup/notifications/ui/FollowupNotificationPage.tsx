import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  History,
  RotateCcw,
  Search,
  Send,
} from 'lucide-react';
import { appRepositories } from '@/src/app/composition/container';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { STORE_CATALOG } from '@/src/modules/auth/domain/identity';
import {
  NOTIFICATION_STATUS_LABEL,
  NOTIFICATION_TEMPLATES,
  type BatchNotifyResult,
  type FollowupNotificationItem,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationStatus,
} from '@/src/modules/members/followup/notifications/domain/notification';
import { downloadCsv } from '@/src/shared/lib/exportCsv';
import { formatDateTime, maskPhone } from '@/src/shared/lib/format';
import type { SemanticTone } from '@/src/shared/types/common';
import { Button } from '@/src/shared/ui/Button';
import { DataTable, type TableColumn } from '@/src/shared/ui/DataTable';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { Modal } from '@/src/shared/ui/Modal';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '@/src/shared/ui/StateViews';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';

const STATUS_TONE: Record<NotificationStatus, SemanticTone> = {
  pending_notify: 'warning',
  notified: 'processing',
  notify_failed: 'error',
  review_completed: 'success',
};

interface Props {
  category: NotificationCategory;
}

export const FollowupNotificationPage: React.FC<Props> = ({ category }) => {
  const queryClient = useQueryClient();
  const { session, currentRole, dataScope, hasPermission } = useAuth();
  const canSend = hasPermission('members.followup.notification.send');
  const canExport = Boolean(currentRole?.sensitiveFields.batchExport);
  const allowPlainPhone = Boolean(currentRole?.sensitiveFields.viewPlaintextPhone);

  // Filter form states
  const [storeId, setStoreId] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<NotificationStatus | 'all'>('all');
  const [channel, setChannel] = useState<NotificationChannel | 'all'>('all');
  const [ownerName, setOwnerName] = useState('');
  const [simulateError, setSimulateError] = useState(false);

  const [appliedFilters, setAppliedFilters] = useState({
    storeId: 'all',
    keyword: '',
    dateFrom: '',
    dateTo: '',
    status: 'all' as NotificationStatus | 'all',
    channel: 'all' as NotificationChannel | 'all',
    ownerName: '',
    simulateError: false,
  });

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Detail & Log modals
  const [detailTarget, setDetailTarget] = useState<FollowupNotificationItem | null>(null);
  const [logTarget, setLogTarget] = useState<FollowupNotificationItem | null>(null);

  // Batch Notify Preview Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTargetIds, setBatchTargetIds] = useState<string[]>([]);
  const [batchChannel, setBatchChannel] = useState<NotificationChannel>('微信服务通知');
  const [batchResult, setBatchResult] = useState<BatchNotifyResult | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['followup_notifications', category, page, appliedFilters, session.roleId, session.currentStoreId],
    queryFn: () =>
      appRepositories.notifications.queryNotifications(
        {
          page,
          pageSize: 8,
          filters: {
            category,
            ...appliedFilters,
          },
        },
        dataScope
      ),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { ids: string[]; channel: NotificationChannel }) => {
      const tpl = NOTIFICATION_TEMPLATES[category];
      return appRepositories.notifications.sendBatchNotifications(
        payload.ids,
        payload.channel,
        tpl.templateName,
        session.displayName,
        dataScope
      );
    },
    onSuccess: (res) => {
      setBatchResult(res);
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ['followup_notifications'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      appRepositories.notifications.markReviewCompleted(id, session.displayName, dataScope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['followup_notifications'] });
      setDetailTarget(null);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({
      storeId,
      keyword,
      dateFrom,
      dateTo,
      status,
      channel,
      ownerName,
      simulateError,
    });
  };

  const handleReset = () => {
    setStoreId('all');
    setKeyword('');
    setDateFrom('');
    setDateTo('');
    setStatus('all');
    setChannel('all');
    setOwnerName('');
    setSimulateError(false);
    setPage(1);
    setAppliedFilters({
      storeId: 'all',
      keyword: '',
      dateFrom: '',
      dateTo: '',
      status: 'all',
      channel: 'all',
      ownerName: '',
      simulateError: false,
    });
  };

  const openBatchNotify = (ids: string[], defaultChannel?: NotificationChannel) => {
    setBatchTargetIds(ids);
    if (defaultChannel) setBatchChannel(defaultChannel);
    setBatchResult(null);
    setBatchModalOpen(true);
  };

  const rows = data?.items ?? [];
  const hasActiveFilter =
    appliedFilters.storeId !== 'all' ||
    Boolean(appliedFilters.keyword) ||
    Boolean(appliedFilters.dateFrom) ||
    Boolean(appliedFilters.dateTo) ||
    appliedFilters.status !== 'all' ||
    appliedFilters.channel !== 'all' ||
    Boolean(appliedFilters.ownerName);

  const previewSampleRow = useMemo(() => {
    return rows.find((r) => batchTargetIds.includes(r.id)) ?? rows[0];
  }, [rows, batchTargetIds]);

  const previewMessage = useMemo(() => {
    const raw = NOTIFICATION_TEMPLATES[category].content;
    return raw
      .replace('{顾客姓名}', previewSampleRow?.customerName ?? '沈佳宁')
      .replace('{上次检查日期}', previewSampleRow?.lastExamDate ?? '2026-08-18')
      .replace('{所属门店}', previewSampleRow?.storeName ?? '杭州西湖旗舰店')
      .replace('{关联单号}', previewSampleRow?.orderOrLensRef ?? 'JG-20261112-008')
      .replace('{计划日期}', previewSampleRow?.plannedDate ?? '2026-11-20');
  }, [category, previewSampleRow]);

  const columns: TableColumn<FollowupNotificationItem>[] = [
    {
      key: 'customerName',
      header: '顾客姓名',
      sticky: true,
      render: (row) => <span className="font-medium text-[#171916]">{row.customerName}</span>,
    },
    {
      key: 'phone',
      header: '手机号',
      render: (row) => (
        <span className="font-mono text-[14px] text-[#5F645D] tabular-nums">
          {maskPhone(row.phone, allowPlainPhone)}
        </span>
      ),
    },
    {
      key: 'storeName',
      header: '所属门店',
      render: (row) => row.storeName,
    },
    {
      key: 'lastExamDate',
      header: category === 'pickup_reminder' ? '完工/开单日期' : '上次检查日期',
      render: (row) => <span className="tabular-nums">{row.lastExamDate}</span>,
    },
    {
      key: 'plannedDate',
      header:
        category === 'pickup_reminder'
          ? '计划取镜日期'
          : category === 'contact_lens_expiry'
            ? '周期到期日期'
            : '计划复查日期',
      render: (row) => <span className="tabular-nums font-medium">{row.plannedDate}</span>,
    },
    {
      key: 'channel',
      header: '通知渠道',
      render: (row) => row.channel,
    },
    {
      key: 'status',
      header: '通知状态',
      render: (row) => (
        <StatusLabel
          tone={STATUS_TONE[row.status]}
          label={NOTIFICATION_STATUS_LABEL[row.status]}
        />
      ),
    },
    {
      key: 'lastNotifiedAt',
      header: '最近通知时间',
      render: (row) => (
        <span className="tabular-nums text-[14px] text-[#5F645D]">
          {formatDateTime(row.lastNotifiedAt)}
        </span>
      ),
    },
    {
      key: 'ownerName',
      header: '负责人',
      render: (row) => row.ownerName,
    },
    {
      key: 'actions',
      header: '操作',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDetailTarget(row)}
            className="text-[14px] text-[#171916] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>查看</span>
          </button>
          <button
            type="button"
            onClick={() => setLogTarget(row)}
            className="text-[14px] text-[#5F645D] hover:text-[#171916] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>通知记录</span>
          </button>
          {canSend && (
            <button
              type="button"
              onClick={() => openBatchNotify([row.id], row.channel)}
              className="text-[14px] font-medium text-[#171916] bg-[#D7FF00] px-3 py-1 rounded-full hover:bg-[#CCF200] inline-flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>发送通知</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleExport = () => {
    if (!canExport || rows.length === 0) return;
    downloadCsv(`千视林_${category}_通知清单`, rows, [
      { key: 'customerName', header: '顾客姓名', accessor: (r) => r.customerName },
      { key: 'phone', header: '手机号', accessor: (r) => maskPhone(r.phone, allowPlainPhone) },
      { key: 'storeName', header: '所属门店', accessor: (r) => r.storeName },
      { key: 'lastExamDate', header: '上次日期', accessor: (r) => r.lastExamDate },
      { key: 'plannedDate', header: '计划日期', accessor: (r) => r.plannedDate },
      { key: 'channel', header: '通知渠道', accessor: (r) => r.channel },
      { key: 'status', header: '通知状态', accessor: (r) => NOTIFICATION_STATUS_LABEL[r.status] },
      { key: 'ownerName', header: '负责人', accessor: (r) => r.ownerName },
    ]);
  };

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <form
        onSubmit={handleSearch}
        className="bg-white border border-[#D9DDD4] rounded-[20px] p-5 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">所属门店</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] text-[#171916] outline-none focus:border-[#171916]"
            >
              <option value="all">全部授权门店</option>
              {STORE_CATALOG.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">顾客姓名或手机号</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="姓名 / 手机 / 单号"
              className="w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] text-[#171916] outline-none focus:border-[#171916]"
            />
          </div>

          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">计划日期（起）</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] text-[#171916] outline-none focus:border-[#171916]"
            />
          </div>

          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">计划日期（止）</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] text-[#171916] outline-none focus:border-[#171916]"
            />
          </div>

          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">通知状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as NotificationStatus | 'all')}
              className="w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] text-[#171916] outline-none focus:border-[#171916]"
            >
              <option value="all">全部状态</option>
              <option value="pending_notify">待通知</option>
              <option value="notified">已通知</option>
              <option value="notify_failed">通知失败</option>
              <option value="review_completed">已完成复查</option>
            </select>
          </div>

          <div>
            <label className="block text-[14px] text-[#5F645D] mb-1">通知渠道</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as NotificationChannel | 'all')}
              className="w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] text-[#171916] outline-none focus:border-[#171916]"
            >
              <option value="all">全部渠道</option>
              <option value="微信服务通知">微信服务通知</option>
              <option value="企微专属顾问">企微专属顾问</option>
              <option value="短信">短信</option>
              <option value="电话外呼">电话外呼</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E8E0]">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="负责人姓名"
              className="h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] w-40 outline-none focus:border-[#171916]"
            />
            <label className="inline-flex items-center gap-1.5 text-[14px] text-[#5F645D] cursor-pointer">
              <input
                type="checkbox"
                checked={simulateError}
                onChange={(e) => setSimulateError(e.target.checked)}
                className="accent-[#171916]"
              />
              <span>模拟请求失败态</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" icon={<Search className="w-3.5 h-3.5" />}>
              查询
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleReset}
            >
              重置
            </Button>
            {canSend && (
              <Button
                type="button"
                variant="accent"
                disabled={selectedIds.length === 0}
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={() => openBatchNotify(selectedIds)}
              >
                批量通知 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </Button>
            )}
            {canExport && (
              <Button
                type="button"
                variant="secondary"
                disabled={rows.length === 0}
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExport}
              >
                导出
              </Button>
            )}
            <HelpTooltip
              tone="warning"
              title="通知状态机说明（待业务确认）"
              content="本页“已通知”仅代表演示通道触发成功，不等同于“顾客已送达”或“已完成复查”；最终回执与自动关单规则待业务确认。"
              placement="bottom-end"
              ariaLabel="查看通知状态机说明"
            />
          </div>
        </div>
      </form>

      {/* Main Content States */}
      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : '加载通知任务失败'}
          onRetry={() => {
            setSimulateError(false);
            setAppliedFilters((prev) => ({ ...prev, simulateError: false }));
            void refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          mode={hasActiveFilter ? 'filtered' : 'initial'}
          actionLabel={hasActiveFilter ? '清空筛选条件' : undefined}
          onAction={hasActiveFilter ? handleReset : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          total={data?.total ?? 0}
          page={page}
          pageSize={8}
          onPageChange={setPage}
          selectable={canSend}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {/* Batch Notification Preview & Execution Modal */}
      <Modal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="发送通知预览与确认"
        subtitle="演示操作，不会发送真实消息，仅更新本地模拟任务状态。"
        footer={
          batchResult ? (
            <Button variant="primary" onClick={() => setBatchModalOpen(false)}>
              完成并关闭
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setBatchModalOpen(false)}>
                取消
              </Button>
              <Button
                variant="accent"
                loading={sendMutation.isPending}
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={() =>
                  sendMutation.mutate({ ids: batchTargetIds, channel: batchChannel })
                }
              >
                确认执行演示发送 ({batchTargetIds.length} 人)
              </Button>
            </>
          )
        }
      >
        {batchResult ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#F8F9F5] border border-[#D9DDD4] flex items-center justify-between gap-4">
              <div>
                <div className="text-[16px] font-semibold text-[#171916]">
                  本次模拟批量处理完成
                </div>
                <div className="text-[14px] text-[#5F645D] mt-0.5">
                  演示操作，未向外部短信/微信网关发出真实请求。
                </div>
              </div>
              <div className="flex items-center gap-4 tabular-nums text-[15px]">
                <span className="text-[#166534] font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 成功 {batchResult.successCount}
                </span>
                <span className="text-[#DC2626] font-semibold inline-flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> 失败 {batchResult.failedCount}
                </span>
              </div>
            </div>

            {batchResult.failures.length > 0 && (
              <div className="border border-[#FECACA] bg-[#FEF2F2] rounded-2xl p-4 space-y-2">
                <div className="text-[15px] font-semibold text-[#DC2626]">
                  失败明细与原因
                </div>
                {batchResult.failures.map((f, idx) => (
                  <div key={idx} className="text-[14px] text-[#171916]">
                    <strong>{f.customerName}：</strong>
                    <span className="text-[#5F645D]">{f.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[15px]">
              <div className="p-3.5 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0]">
                <div className="text-[#73796F] text-[14px]">拟发送人数</div>
                <div className="text-[22px] font-semibold text-[#171916] tabular-nums mt-1">
                  {batchTargetIds.length} 位顾客
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-[#73796F] text-[14px]">选择通知渠道</label>
                  <HelpTooltip
                    title="演示通道说明"
                    content="演示操作，不会发送真实消息；若包含尾号33且选“短信”渠道，将演示局部发送失败处理。"
                    placement="bottom-end"
                    ariaLabel="查看演示通道说明"
                  />
                </div>
                <select
                  value={batchChannel}
                  onChange={(e) => setBatchChannel(e.target.value as NotificationChannel)}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#D9DDD4] text-[15px] text-[#171916]"
                >
                  <option value="微信服务通知">微信服务通知</option>
                  <option value="企微专属顾问">企微专属顾问</option>
                  <option value="短信">短信</option>
                  <option value="电话外呼">电话外呼</option>
                </select>
              </div>
            </div>

            <div>
              <div className="text-[14px] text-[#5F645D] mb-1.5">
                匹配模板：{NOTIFICATION_TEMPLATES[category].templateName}
              </div>
              <div className="p-4 rounded-xl bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] text-[#171916] leading-relaxed">
                {previewMessage}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Review Detail Modal */}
      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title={`复查通知详情 · ${detailTarget?.customerName ?? ''}`}
        subtitle={`关联单号 / 镜片参考：${detailTarget?.orderOrLensRef ?? ''}`}
        footer={
          detailTarget && (
            <>
              {canSend && detailTarget.status !== 'review_completed' && (
                <Button
                  variant="accent"
                  loading={completeMutation.isPending}
                  onClick={() => completeMutation.mutate(detailTarget.id)}
                >
                  标记为已完成复查
                </Button>
              )}
              <Button variant="secondary" onClick={() => setDetailTarget(null)}>
                关闭
              </Button>
            </>
          )
        }
      >
        {detailTarget && (
          <div className="grid grid-cols-2 gap-4 text-[15px]">
            <div>
              <div className="text-[#73796F] text-[14px]">脱敏手机号</div>
              <div className="font-mono mt-1">{maskPhone(detailTarget.phone, allowPlainPhone)}</div>
            </div>
            <div>
              <div className="text-[#73796F] text-[14px]">所属门店</div>
              <div className="mt-1">{detailTarget.storeName}</div>
            </div>
            <div>
              <div className="text-[#73796F] text-[14px]">上次检查/开单日期</div>
              <div className="mt-1 tabular-nums">{detailTarget.lastExamDate}</div>
            </div>
            <div>
              <div className="text-[#73796F] text-[14px]">计划日期</div>
              <div className="mt-1 tabular-nums font-medium">{detailTarget.plannedDate}</div>
            </div>
            <div>
              <div className="text-[#73796F] text-[14px]">当前状态</div>
              <div className="mt-1">
                <StatusLabel
                  tone={STATUS_TONE[detailTarget.status]}
                  label={NOTIFICATION_STATUS_LABEL[detailTarget.status]}
                />
              </div>
            </div>
            <div>
              <div className="text-[#73796F] text-[14px]">负责顾问</div>
              <div className="mt-1">{detailTarget.ownerName}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Notification Logs Modal */}
      <Modal
        open={Boolean(logTarget)}
        onClose={() => setLogTarget(null)}
        title={`通知发送流水 · ${logTarget?.customerName ?? ''}`}
        subtitle="记录每次模拟触发的时间、渠道、操作人及结果"
        footer={
          <Button variant="secondary" onClick={() => setLogTarget(null)}>
            关闭
          </Button>
        }
      >
        {logTarget && logTarget.logs.length === 0 ? (
          <div className="py-8 text-center text-[15px] text-[#5F645D]">
            暂无发送记录，当前处于“待通知”状态。
          </div>
        ) : (
          <div className="space-y-3">
            {logTarget?.logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-[#F8F9F5] border border-[#E5E8E0] text-[15px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#171916]">
                    {log.channel} · {log.templateName}
                  </span>
                  <StatusLabel
                    tone={log.result === 'notified' ? 'processing' : 'error'}
                    label={log.result === 'notified' ? '已通知' : '通知失败'}
                  />
                </div>
                <p className="mt-1.5 text-[14px] text-[#5F645D]">{log.detail}</p>
                <div className="mt-1.5 text-[13px] text-[#73796F] tabular-nums">
                  {formatDateTime(log.sentAt)} · 操作人：{log.operator}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
