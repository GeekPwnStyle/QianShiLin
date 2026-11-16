export type NotificationCategory =
  | 'review_reminder'
  | 'pickup_reminder'
  | 'contact_lens_expiry';

export type NotificationStatus =
  | 'pending_notify'
  | 'notified'
  | 'notify_failed'
  | 'review_completed';

export type NotificationChannel = '短信' | '微信服务通知' | '企微专属顾问' | '电话外呼';

export interface NotificationLogEntry {
  id: string;
  sentAt: string;
  channel: NotificationChannel;
  operator: string;
  templateName: string;
  result: 'notified' | 'notify_failed';
  detail: string;
}

export interface FollowupNotificationItem {
  id: string;
  category: NotificationCategory;
  customerId: string;
  customerName: string;
  phone: string;
  storeId: string;
  storeName: string;
  lastExamDate: string;
  plannedDate: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  lastNotifiedAt?: string;
  ownerName: string;
  orderOrLensRef: string;
  logs: NotificationLogEntry[];
}

export interface BatchNotifyPreview {
  recipientCount: number;
  channel: NotificationChannel;
  templateName: string;
  sampleMessage: string;
}

export interface BatchNotifyResult {
  total: number;
  successCount: number;
  failedCount: number;
  failures: Array<{ customerName: string; reason: string }>;
}

export const NOTIFICATION_STATUS_LABEL: Record<NotificationStatus, string> = {
  pending_notify: '待通知',
  notified: '已通知',
  notify_failed: '通知失败',
  review_completed: '已完成复查',
};

export const NOTIFICATION_TEMPLATES: Record<
  NotificationCategory,
  { templateName: string; content: string }
> = {
  review_reminder: {
    templateName: '视力定期复查关怀模板（示例）',
    content:
      '【千视林视光】尊敬的{顾客姓名}，您上次视光建档时间为{上次检查日期}，建议近期前往{所属门店}进行周期视力复查与镜架校准。回复T退订。',
  },
  pickup_reminder: {
    templateName: '配镜质检完成取镜模板（示例）',
    content:
      '【千视林视光】尊敬的{顾客姓名}，您的定制眼镜（单号{关联单号}）已在{所属门店}完成质检，欢迎预约到店试戴取镜。',
  },
  contact_lens_expiry: {
    templateName: '隐形眼镜周期更换提醒模板（示例）',
    content:
      '【千视林视光】尊敬的{顾客姓名}，您购买的隐形眼镜周期将于{计划日期}临近更换，建议及时复查角膜状况并补充新片。',
  },
};
