/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/src/modules/auth/application/AuthContext';
import { LoginView } from '@/src/modules/auth/ui/LoginView';
import {
  NavigationProvider,
  useNavigation,
} from '@/src/modules/navigation/application/NavigationContext';
import { AppShell } from '@/src/widgets/app-shell/AppShell';
import { PageDispatcher } from '@/src/app/PageDispatcher';
import { BrandLogoMark } from '@/src/shared/ui/BrandLogoMark';
import { AmbientBackdrop } from '@/src/shared/ui/AmbientBackdrop';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const AppRouterView: React.FC = () => {
  const { isAuthenticated, authLoading, permissionsLoading, permissionsError, refetchRoles } = useAuth();
  const { isLoginRoute, navigateToRoute } = useNavigation();

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated && !isLoginRoute) {
      navigateToRoute('/login');
    }
  }, [isAuthenticated, authLoading, isLoginRoute, navigateToRoute]);

  if (authLoading || (!isLoginRoute && permissionsLoading)) return <WorkspaceLoading />;
  if (!isLoginRoute && permissionsError) return <WorkspaceLoading retry={refetchRoles} />;
  if (!isAuthenticated || isLoginRoute) {
    return <LoginView />;
  }
  return (
    <div className="qsl-workspace-ready"><AppShell>
      <PageDispatcher />
    </AppShell></div>
  );
};

function WorkspaceLoading({ retry }: { retry?: () => void }) {
  return <div className="grid min-h-dvh place-items-center px-5">
    <div role={retry ? 'alert' : 'status'} className="qsl-startup-card w-full max-w-sm rounded-[28px] border bg-white/90 px-8 py-9 text-center shadow-xl shadow-black/5">
      <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center">
        {!retry && <span aria-hidden="true" className="qsl-startup-ring absolute inset-0 rounded-full border-2 border-[var(--qsl-accent-soft)] border-t-[var(--qsl-accent-soft-ink)]" />}
        <BrandLogoMark size={34} />
      </div>
      <h1 className="text-lg font-semibold">{retry ? '权限加载失败' : '正在准备工作台'}</h1>
      <p className="mt-2 text-sm text-[var(--qsl-ink-secondary)]">{retry ? '请重试加载账号权限。' : '正在确认登录状态与账号权限'}</p>
      {retry ? <button type="button" onClick={retry} className="mt-5 rounded-xl bg-[var(--qsl-accent)] px-4 py-2 font-semibold text-[var(--qsl-accent-ink)]">重试</button>
        : <div aria-hidden="true" className="mx-auto mt-6 h-1 w-32 overflow-hidden rounded-full bg-[var(--qsl-accent-soft)]"><div className="qsl-startup-sweep h-full w-1/2 rounded-full bg-[var(--qsl-accent-soft-ink)]" /></div>}
    </div>
  </div>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationProvider>
          <AmbientBackdrop />
          <div className="relative z-10 min-h-screen">
            <AppRouterView />
          </div>
        </NavigationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
