export type NoticeSeverity = 'normal' | 'important' | 'urgent';
export type NoticeCategory = 'general' | 'work' | 'maintenance' | 'policy';
export type NoticeAudience = { mode: 'all' | 'roles' | 'users'; roleIds: string[]; userIds: string[]; storeIds: string[] };
export type Notice = { id: string; title: string; category: NoticeCategory; severity: NoticeSeverity;
  content: string; publisherName: string; publishedAt: string; createdAt: string; readAt: string | null;
  audience?: NoticeAudience; recipientCount?: number; readCount?: number; unreadCount?: number; scheduled?: boolean };
export type NoticePage = { items: Notice[]; total: number; page: number; pageSize: number };
export type NoticeRecipients = { users: Array<{ id: string; username: string; display_name: string; role_id: string;
  role_name: string; identity_type: string; store_ids: string[] }>;
  roles: Array<{ id: string; name: string; identity_type: string }> };
export type NoticeReceipt = { user_id:string; display_name:string; username:string; recipient_role_id:string;
  recipient_role_name:string; recipient_store_ids:string[]; read_at:string|null };
const base = `${import.meta.env.BASE_URL}api/notices`;
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, { method, credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? `请求失败（${response.status}）`);
  return value as T;
}
export const noticesApi = {
  unreadCount: () => request<{count:number}>('/unread-count'),
  inbox: (status: 'all'|'unread'|'read', page = 1, pageSize = 20) => request<NoticePage>(`/inbox?status=${status}&page=${page}&pageSize=${pageSize}`),
  detail: (id: string) => request<Notice>(`/${encodeURIComponent(id)}`),
  markRead: (id: string) => request<{readAt:string}>(`/${encodeURIComponent(id)}/read`, 'POST'),
  adminList: (page: number, search: string, pageSize = 10) => request<NoticePage>(`/admin?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`),
  recipients: () => request<NoticeRecipients>('/recipients'),
  receipts: (id: string) => request<{items:NoticeReceipt[];total:number;allRead:boolean}>(`/admin/${encodeURIComponent(id)}/receipts`),
  publish: (body: { title:string; category:NoticeCategory; severity:NoticeSeverity; content:string;
    audience:NoticeAudience; publishAt?:string }) => request<{id:string;recipientCount:number;publishedAt:string}>('/admin','POST',body),
};
export const categoryNames: Record<NoticeCategory,string> = { general:'日常通知',work:'工作提醒',maintenance:'维护公告',policy:'制度通知' };
export const severityNames: Record<NoticeSeverity,string> = { normal:'普通',important:'重要',urgent:'紧急' };
