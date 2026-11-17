import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

let host: HTMLElement | null = null;
function statusHost() {
  if (!host || !host.isConnected) {
    host = document.createElement('div');
    host.className = 'fixed inset-x-0 top-4 z-[1000] flex flex-col items-center gap-3 px-4 pointer-events-none';
    host.setAttribute('aria-label', '操作状态');
    document.body.appendChild(host);
  }
  return host;
}
export function OperationStatus({ children, role = 'status', loading = false }: { children: React.ReactNode; role?: 'status' | 'alert'; loading?: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    if (loading) return;
    const timer = window.setTimeout(() => setVisible(false), role === 'alert' ? 8000 : 4000);
    return () => window.clearTimeout(timer);
  }, [children, loading, role]);
  if (!visible) return null;
  return createPortal(<div role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'} className={`pointer-events-auto flex w-fit max-w-[min(560px,100%)] items-center gap-3 rounded-2xl border bg-white px-5 py-3 text-sm shadow-xl ${role === 'alert' ? 'border-red-200 text-red-700' : 'border-[#D9DDD4] text-[#171916]'}`}>
    {loading && <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#D9DDD4] border-t-[#171916]" />}
    <div className="min-w-0 break-words">{children}</div>
    <button type="button" aria-label="关闭操作提示" onClick={() => setVisible(false)} className="ml-auto shrink-0 rounded-full px-2 py-1 hover:bg-black/5">×</button>
  </div>, statusHost());
}
