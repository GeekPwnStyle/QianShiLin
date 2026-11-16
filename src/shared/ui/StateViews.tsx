import React from 'react';
import { AlertCircle, Inbox, Lock, SearchX, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { HelpTooltip } from './HelpTooltip';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="bg-white border border-[#D9DDD4] rounded-[20px] p-6 space-y-4" aria-busy="true" aria-label="正在加载数据">
    <div className="flex items-center justify-between gap-4">
      <div className="h-4 w-48 bg-[#EAECE6] rounded animate-pulse" />
      <div className="h-4 w-24 bg-[#EAECE6] rounded animate-pulse" />
    </div>
    <div className="border-t border-[#E5E8E0] pt-4 space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-10 bg-[#F8F9F5] rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
);

export const EmptyState: React.FC<{
  mode: 'initial' | 'filtered';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ mode, title, description, actionLabel, onAction }) => {
  const isFiltered = mode === 'filtered';
  return (
    <div className="bg-white border border-[#D9DDD4] rounded-[20px] px-6 py-14 text-center flex flex-col items-center">
      <div className="w-11 h-11 rounded-full bg-[#F1F2EE] flex items-center justify-center text-[#5F645D] mb-4">
        {isFiltered ? <SearchX className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
      </div>
      <h3 className="text-[18px] font-semibold text-[#171916]">
        {title ?? (isFiltered ? '未找到符合筛选条件的记录' : '暂无业务数据')}
      </h3>
      <p className="mt-1.5 text-[15px] text-[#5F645D] max-w-md">
        {description ??
          (isFiltered
            ? '请尝试调整筛选日期、门店范围或清除关键词后重新查询。'
            : '当前范围尚未录入相关记录，您可以通过上方操作按钮新增数据。')}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant={isFiltered ? 'secondary' : 'primary'} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = '演示服务模拟请求失败，请检查查询条件或重试。', onRetry }) => (
  <div className="bg-white border border-[#FECACA] rounded-[20px] px-6 py-12 text-center flex flex-col items-center">
    <div className="w-11 h-11 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#DC2626] mb-4">
      <AlertCircle className="w-5 h-5" />
    </div>
    <h3 className="text-[18px] font-semibold text-[#171916]">数据加载异常</h3>
    <p className="mt-1.5 text-[15px] text-[#5F645D] max-w-md">{message}</p>
    {onRetry && (
      <div className="mt-5">
        <Button variant="secondary" icon={<RefreshCw className="w-4 h-4" />} onClick={onRetry}>
          重新加载
        </Button>
      </div>
    )}
  </div>
);

export const NoPermissionState: React.FC<{
  moduleLabel?: string;
  requiredPermission?: string;
  currentRoleName?: string;
  onBackWorkbench?: () => void;
}> = ({ moduleLabel, requiredPermission, currentRoleName, onBackWorkbench }) => (
  <div className="bg-white border border-[#D9DDD4] rounded-[20px] px-6 py-16 text-center flex flex-col items-center">
    <div className="w-12 h-12 rounded-full bg-[#F1F2EE] flex items-center justify-center text-[#171916] mb-4">
      <Lock className="w-5 h-5" />
    </div>
    <div className="inline-flex items-center gap-2">
      <h3 className="text-[20px] font-semibold text-[#171916]">无权访问此页面</h3>
      <HelpTooltip
        title="权限隔离说明"
        content="前端权限提示仅用于界面隔离展示，未来正式环境将由 NestJS 服务端强制执行身份与数据范围校验。"
        placement="bottom-center"
      />
    </div>
    <p className="mt-2 text-[15px] text-[#5F645D] max-w-lg">
      当前账号身份「{currentRoleName ?? '未授权角色'}」未获得访问
      {moduleLabel ? `「${moduleLabel}」` : '该功能'}的操作权限或数据范围授权。
    </p>
    {requiredPermission && (
      <p className="mt-2 text-[14px] text-[#73796F] font-mono">
        所需权限标识：{requiredPermission}
      </p>
    )}
    {onBackWorkbench && (
      <div className="mt-6">
        <Button variant="primary" onClick={onBackWorkbench}>
          返回系统工作台
        </Button>
      </div>
    )}
  </div>
);

export const UnconfirmedRuleBanner: React.FC<{
  title?: string;
  note: string;
}> = ({ title = '待确认业务规则提示', note }) => (
  <div className="inline-flex items-center gap-2">
    <HelpTooltip
      tone="warning"
      title={title}
      content={note}
      ariaLabel={title}
    />
  </div>
);
