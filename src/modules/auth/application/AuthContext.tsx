import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PRESET_SESSIONS,
  checkPermission,
  type AuthSession,
  type AvatarColorPreset,
  type RoleDefinition,
} from '@/src/modules/auth/domain/identity';
import { appRepositories } from '@/src/app/composition/container';
import type { DataScopeContext } from '@/src/shared/types/common';

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
  authLoading: boolean;
  session: AuthSession;
  currentRole: RoleDefinition | undefined;
  allRoles: RoleDefinition[];
  dataScope: DataScopeContext;
  loginWithCredentials: (username: string, password: string) => Promise<LoginResult>;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<AuthSession>(PRESET_SESSIONS.admin);
  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}api/session`, { credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) return;
        const { user } = await r.json();
        const preset = Object.values(PRESET_SESSIONS).find((s) => s.username === user.username);
        if (active && preset) {
          setSession(applySavedAvatar({ ...preset, userId: user.id }));
          setIsAuthenticated(true);
        }
      }).catch(() => {}).finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

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

  const loginWithCredentials = async (username: string, password: string): Promise<LoginResult> => {
    if (!username.trim() || !password) return { ok: false, error: '请输入用户名和密码。' };
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/login`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) return { ok: false, error: response.status === 401 ? '用户名或密码错误。' : '登录服务暂不可用。' };
      const { user } = await response.json();
      const preset = Object.values(PRESET_SESSIONS).find((s) => s.username === user.username);
      if (!preset) return { ok: false, error: '账号角色尚未配置。' };
      setSession(applySavedAvatar({ ...preset, userId: user.id }));
      setIsAuthenticated(true);
      return { ok: true };
    } catch { return { ok: false, error: '无法连接登录服务。' }; }
  };

  const logout = () => {
    setIsAuthenticated(false);
    void fetch(`${import.meta.env.BASE_URL}api/logout`, { method: 'POST', credentials: 'same-origin' });
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

  // Identity switching is disabled once credentials are verified by the API.
  const switchPresetIdentity = (_presetKey: string) => {};

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
    authLoading,
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
