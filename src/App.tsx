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
  const { isAuthenticated } = useAuth();
  const { isLoginRoute, navigateToRoute } = useNavigation();

  React.useEffect(() => {
    if (!isAuthenticated && !isLoginRoute) {
      navigateToRoute('/login');
    }
  }, [isAuthenticated, isLoginRoute, navigateToRoute]);

  if (!isAuthenticated || isLoginRoute) {
    return <LoginView />;
  }
  return (
    <AppShell>
      <PageDispatcher />
    </AppShell>
  );
};

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
