import React, { createContext, useContext, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LOGIN_ACCOUNTS,
  PRESET_SESSIONS,
  checkPermission,
  type AuthSession,
  type RoleDefinition,
} from '@/src/modules/auth/domain/identity';
import { appRepositories } from '@/src/app/composition/container';
import type { DataScopeContext } from '@/src/shared/types/common';

const AUTH_SESSION_KEY = 'qsl_auth_preset_key_v1';

function loadInitialAuthState(): { isAuthenticated: boolean; session: AuthSession } {
  if (typeof window === 'undefined') {
    return { isAuthenticated: true, session: PRESET_SESSIONS.admin };
  }
  try {
    const saved = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    if (saved === 'logged_out') {
      return { isAuthenticated: false, session: PRESET_SESSIONS.admin };
    }
    if (saved && saved in PRESET_SESSIONS) {
      return { isAuthenticated: true, session: PRESET_SESSIONS[saved] };
    }
  } catch {
    // Ignore storage read errors
  }
  return { isAuthenticated: true, session: PRESET_SESSIONS.admin };
}

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  session: AuthSession;
  currentRole: RoleDefinition | undefined;
  allRoles: RoleDefinition[];
  dataScope: DataScopeContext;
  loginWithCredentials: (username: string, password: string) => LoginResult;
  logout: () => void;
  switchPresetIdentity: (presetKey: string) => void;
  switchStore: (storeId: string) => void;
  hasPermission: (permissionCode?: string) => boolean;
  refetchRoles: () => void;
  resetAllDemoData: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const initialState = useMemo(() => loadInitialAuthState(), []);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialState.isAuthenticated);
  const [session, setSession] = useState<AuthSession>(initialState.session);

  const { data: allRoles = [], refetch } = useQuery({
    queryKey: ['rbac', 'roles'],
    queryFn: () => appRepositories.roles.listRoles(),
  });

  const currentRole = useMemo(() => {
    return allRoles.find((r) => r.id === session.roleId) ?? allRoles[0];
  }, [allRoles, session.roleId]);

  const dataScope: DataScopeContext = useMemo(
    () => ({
      identityType: session.identityType,
      roleId: session.roleId,
      storeId: session.currentStoreId,
      storeName: session.currentStoreName,
      supplierId: session.supplierId,
      supplierName: session.supplierName,
      authorizedStoreIds: session.authorizedStores.map((s) => s.id),
    }),
    [session]
  );

  const persistAuthKey = (value: string) => {
    try {
      window.sessionStorage.setItem(AUTH_SESSION_KEY, value);
    } catch {
      // Ignore storage write errors
    }
  };

  const loginWithCredentials = (rawUsername: string, rawPassword: string): LoginResult => {
    const usernameInput = rawUsername.trim();
    const passwordInput = rawPassword;

    if (!usernameInput) {
      return { ok: false, error: '请输入用户名。' };
    }
    if (!passwordInput) {
      return { ok: false, error: '请输入密码。' };
    }

    const lower = usernameInput.toLowerCase();
    const matched = LOGIN_ACCOUNTS.find(
      (acc) =>
        acc.username.toLowerCase() === lower ||
        acc.aliases.some((alias) => alias.toLowerCase() === lower)
    );

    if (!matched) {
      return {
        ok: false,
        error: '用户名不存在，请点击用户名输入框旁的「?」查看账号与角色说明。',
      };
    }

    if (passwordInput !== usernameInput && passwordInput !== matched.username) {
      return {
        ok: false,
        error: '密码错误：演示环境设定密码与用户名一致。',
      };
    }

    setSession(PRESET_SESSIONS[matched.presetKey]);
    setIsAuthenticated(true);
    persistAuthKey(matched.presetKey);
    return { ok: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    persistAuthKey('logged_out');
  };

  const switchPresetIdentity = (presetKey: string) => {
    if (presetKey in PRESET_SESSIONS) {
      setSession(PRESET_SESSIONS[presetKey]);
      setIsAuthenticated(true);
      persistAuthKey(presetKey);
      return;
    }
    const matchedRole = allRoles.find((r) => r.id === presetKey);
    if (!matchedRole) return;
    if (matchedRole.identityType === 'admin') {
      setSession({ ...PRESET_SESSIONS.admin, roleId: matchedRole.id, roleName: matchedRole.name });
    } else if (matchedRole.identityType === 'supplier') {
      setSession({ ...PRESET_SESSIONS.supplier, roleId: matchedRole.id, roleName: matchedRole.name });
    } else {
      const base =
        matchedRole.subRole === 'store_guide'
          ? PRESET_SESSIONS.store_guide
          : matchedRole.subRole === 'store_optometrist'
            ? PRESET_SESSIONS.store_optometrist
            : PRESET_SESSIONS.store_manager;
      setSession({
        ...base,
        roleId: matchedRole.id,
        roleName: matchedRole.name,
        title: `${matchedRole.name} · ${base.currentStoreName}`,
      });
    }
    setIsAuthenticated(true);
  };

  const switchStore = (storeId: string) => {
    if (storeId === 'all' && session.identityType === 'admin') {
      setSession((prev) => ({
        ...prev,
        currentStoreId: 'all',
        currentStoreName: `全部授权门店 (${prev.authorizedStores.length}家)`,
      }));
      return;
    }
    const target = session.authorizedStores.find((s) => s.id === storeId);
    if (!target) return;
    setSession((prev) => ({
      ...prev,
      currentStoreId: target.id,
      currentStoreName: target.name,
    }));
  };

  const hasPermission = (permissionCode?: string) => checkPermission(currentRole, permissionCode);

  const resetAllDemoData = () => {
    appRepositories.resetDemoData();
    void queryClient.invalidateQueries();
  };

  const value: AuthContextValue = {
    isAuthenticated,
    session,
    currentRole,
    allRoles,
    dataScope,
    loginWithCredentials,
    logout,
    switchPresetIdentity,
    switchStore,
    hasPermission,
    refetchRoles: () => {
      void refetch();
    },
    resetAllDemoData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
