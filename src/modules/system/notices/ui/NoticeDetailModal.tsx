import React from 'react';
import { Modal } from '@/src/shared/ui/Modal';
import { categoryNames, severityNames, type Notice } from '../infrastructure/noticesApi';

export const NoticeDetailModal: React.FC<{ notice: Notice | null; onClose: () => void }> = ({notice,onClose}) =>
  <Modal open={Boolean(notice)} onClose={onClose} title={notice?.title ?? '公告详情'} subtitle={notice ? `${categoryNames[notice.category]} · ${severityNames[notice.severity]}` : undefined} maxWidthClass="max-w-3xl">
    {notice && <div className="space-y-6"><div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[#E5E8E0] pb-4 text-sm text-[#6D736A]"><span>发布人：{notice.publisherName}</span><span>发布时间：{new Date(notice.publishedAt).toLocaleString('zh-CN')}</span>{notice.readAt && <span>已读于：{new Date(notice.readAt).toLocaleString('zh-CN')}</span>}</div><article className="whitespace-pre-wrap break-words text-[15px] leading-8 text-[#171916]">{notice.content}</article></div>}
  </Modal>;
