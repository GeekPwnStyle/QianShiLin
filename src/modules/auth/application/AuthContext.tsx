import React, { createContext, useContext, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LOGIN_ACCOUNTS,
  PRESET_SESSIONS,
  checkPermission,
  type AuthSession,
  type AvatarColorPreset,
  type RoleDefinition,
} from '@/src/modules/auth/domain/identity';
import { appRepositories } from '@/src/app/composition/container';
import type { DataScopeContext } from '@/src/shared/types/common';

const AUTH_SESSION_KEY = 'qsl_auth_preset_key_v2';
const AVATAR_STORAGE_KEY = 'qsl_user_avatars_v1';

interface SavedAvatarPref {
  avatarUrl?: string;
  avatarInitials?: string;
  avatarColorPreset?: AvatarColorPreset;
}

function readAvatarMap(): Record<string, SavedAvatarPref> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, SavedAvatarPref>) : {};
  } catch {
    return {};
  }
}

function applySavedAvatar(base: AuthSession): AuthSession {
  const saved = readAvatarMap()[base.username];
  if (!saved) return base;
  return {
    ...base,
    avatarUrl: saved.avatarUrl ?? base.avatarUrl,
    avatarInitials: saved.avatarInitials?.trim() || base.avatarInitials,
    avatarColorPreset: saved.avatarColorPreset ?? base.avatarColorPreset,
  };
}

function loadInitialAuthState(): { isAuthenticated: boolean; session: AuthSession } {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, session: PRESET_SESSIONS.admin };
  }
  try {
    const saved = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    if (saved && saved !== 'logged_out' && saved in PRESET_SESSIONS) {
      return { isAuthenticated: true, session: applySavedAvatar(PRESET_SESSIONS[saved]) };
    }
  } catch {
    // Ignore storage read errors
  }
  return { isAuthenticated: false, session: applySavedAvatar(PRESET_SESSIONS.admin) };
}

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AvatarUpdatePatch {
  avatarUrl?: string | null;
  avatarInitials?: string;
  avatarColorPreset?: AvatarColorPreset;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  session: AuthSession;
  currentRole: RoleDefinition | undefined;
  allRoles: RoleDefinition[];
  dataScope: DataScopeContext;
  loginWithCredentials: (username: string, password: string) => LoginResult;
  logout: () => void;
  updateAvatar: (patch: AvatarUpdatePatch) => void;
  resetAvatar: () => void;
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

    setSession(applySavedAvatar(PRESET_SESSIONS[matched.presetKey]));
    setIsAuthenticated(true);
    persistAuthKey(matched.presetKey);
    return { ok: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    persistAuthKey('logged_out');
  };

  const updateAvatar = (patch: AvatarUpdatePatch) => {
    setSession((prev) => {
      const nextUrl =
        patch.avatarUrl === null
          ? undefined
          : patch.avatarUrl !== undefined
            ? patch.avatarUrl
            : prev.avatarUrl;
      const nextInitials =
        patch.avatarInitials !== undefined
          ? patch.avatarInitials.trim().slice(0, 2) ||
            PRESET_SESSIONS[
              Object.keys(PRESET_SESSIONS).find(
                (k) => PRESET_SESSIONS[k].username === prev.username
              ) ?? 'admin'
            ]?.avatarInitials ||
            prev.avatarInitials
          : prev.avatarInitials;
      const nextPreset = patch.avatarColorPreset ?? prev.avatarColorPreset;

      try {
        const map = readAvatarMap();
        map[prev.username] = {
          ...(nextUrl ? { avatarUrl: nextUrl } : {}),
          avatarInitials: nextInitials,
          ...(nextPreset ? { avatarColorPreset: nextPreset } : {}),
        };
        window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(map));
      } catch {
        // Ignore storage quota errors
      }

      return {
        ...prev,
        avatarUrl: nextUrl,
        avatarInitials: nextInitials,
        avatarColorPreset: nextPreset,
      };
    });
  };

  const resetAvatar = () => {
    setSession((prev) => {
      const base =
        Object.values(PRESET_SESSIONS).find((s) => s.username === prev.username) ??
        PRESET_SESSIONS.admin;
      try {
        const map = readAvatarMap();
        delete map[prev.username];
        window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(map));
      } catch {
        // Ignore storage errors
      }
      return {
        ...prev,
        avatarUrl: undefined,
        avatarInitials: base.avatarInitials,
        avatarColorPreset: undefined,
      };
    });
  };

  const switchPresetIdentity = (presetKey: string) => {
    if (presetKey in PRESET_SESSIONS) {
      setSession(applySavedAvatar(PRESET_SESSIONS[presetKey]));
      setIsAuthenticated(true);
      persistAuthKey(presetKey);
      return;
    }
    const matchedRole = allRoles.find((r) => r.id === presetKey);
    if (!matchedRole) return;
    if (matchedRole.identityType === 'admin') {
      setSession(
        applySavedAvatar({
          ...PRESET_SESSIONS.admin,
          roleId: matchedRole.id,
          roleName: matchedRole.name,
        })
      );
    } else if (matchedRole.identityType === 'supplier') {
      setSession(
        applySavedAvatar({
          ...PRESET_SESSIONS.supplier,
          roleId: matchedRole.id,
          roleName: matchedRole.name,
        })
      );
    } else {
      const base =
        matchedRole.subRole === 'store_guide'
          ? PRESET_SESSIONS.store_guide
          : matchedRole.subRole === 'store_optometrist'
            ? PRESET_SESSIONS.store_optometrist
            : PRESET_SESSIONS.store_manager;
      setSession(
        applySavedAvatar({
          ...base,
          roleId: matchedRole.id,
          roleName: matchedRole.name,
          title: `${matchedRole.name} · ${base.currentStoreName}`,
        })
      );
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
    updateAvatar,
    resetAvatar,
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
