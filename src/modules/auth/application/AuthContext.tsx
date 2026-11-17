import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LOGIN_ACCOUNTS,
  PRESET_SESSIONS,
  STORE_CATALOG,
  checkPermission,
  type AuthSession,
  type AvatarColorPreset,
  type RoleDefinition,
} from '@/src/modules/auth/domain/identity';
import { appRepositories } from '@/src/app/composition/container';
import type { DataScopeContext } from '@/src/shared/types/common';

const AVATAR_STORAGE_KEY = 'qsl_user_avatars_v1';
const DEBUG_MODE_STORAGE_KEY = 'qsl_auth_debug_mode_v1';
const DEBUG_SESSION_KEY = 'qsl_debug_auth_preset_v1';

function loadInitialDebugMode(): boolean {
  if (typeof window === 'undefined') return import.meta.env.BASE_URL === '/';
  try {
    const saved = window.localStorage.getItem(DEBUG_MODE_STORAGE_KEY);
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  } catch {
    // Ignore storage read errors
  }
  return import.meta.env.BASE_URL === '/';
}

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

type ServerUser = { id: string; username: string; role_id?: string | null;
  store_ids?: string[] | null; permission_denies?: string[] | null };

function applyServerAccess(preset: AuthSession, user: ServerUser): AuthSession {
  const allowedStores = (user.store_ids ?? preset.authorizedStores.map(store => store.id))
    .map(id => STORE_CATALOG.find(store => store.id === id)).filter((store): store is (typeof STORE_CATALOG)[number] => Boolean(store));
  const isAll = preset.identityType === 'admin';
  return applySavedAvatar({ ...preset, userId: user.id, roleId: user.role_id ?? preset.roleId,
    authorizedStores: allowedStores, permissionDenies: user.permission_denies ?? [],
    currentStoreId: isAll ? 'all' : allowedStores[0]?.id ?? preset.currentStoreId,
    currentStoreName: isAll ? `全部授权门店 (${allowedStores.length}家)` : allowedStores[0]?.name ?? preset.currentStoreName });
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
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
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
  const [debugMode, setDebugModeState] = useState<boolean>(() => loadInitialDebugMode());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<AuthSession>(PRESET_SESSIONS.admin);

  const setDebugMode = (enabled: boolean) => {
    setDebugModeState(enabled);
    try {
      window.localStorage.setItem(DEBUG_MODE_STORAGE_KEY, String(enabled));
    } catch {
      // Ignore storage write errors
    }
  };

  useEffect(() => {
    let active = true;

    if (debugMode) {
      try {
        const savedPreset = window.sessionStorage.getItem(DEBUG_SESSION_KEY);
        if (savedPreset && savedPreset in PRESET_SESSIONS) {
          setSession(applySavedAvatar(PRESET_SESSIONS[savedPreset]));
          setIsAuthenticated(true);
        }
      } catch {
        // Ignore storage read errors
      }
      setAuthLoading(false);
      return () => {
        active = false;
      };
    }

    fetch(`${import.meta.env.BASE_URL}api/session`, { credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) return;
        const { user }: { user: ServerUser } = await r.json();
        const preset = Object.values(PRESET_SESSIONS).find((s) => s.username === user.username);
        if (active && preset) {
          setSession(applyServerAccess(preset,user));
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const { data: allRoles = [], refetch } = useQuery({
    queryKey: ['rbac', 'roles', debugMode, isAuthenticated],
    queryFn: () => appRepositories.roles.listRoles(),
    enabled: debugMode || isAuthenticated,
  });

  const currentRole = useMemo(() => {
    const role = allRoles.find((r) => r.id === session.roleId) ?? allRoles[0];
    return role ? { ...role, permissions: role.permissions.filter(code => !session.permissionDenies?.includes(code)) } : undefined;
  }, [allRoles, session.roleId, session.permissionDenies]);

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
    const usernameInput = username.trim();
    if (!usernameInput) return { ok: false, error: '请输入用户名。' };
    if (!password) return { ok: false, error: '请输入密码。' };

    if (debugMode) {
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

      if (password !== usernameInput && password !== matched.username) {
        return {
          ok: false,
          error: '密码错误：debug 模式默认密码与用户名一致。',
        };
      }

      setSession(applySavedAvatar(PRESET_SESSIONS[matched.presetKey]));
      setIsAuthenticated(true);
      try {
        window.sessionStorage.setItem(DEBUG_SESSION_KEY, matched.presetKey);
      } catch {
        // Ignore storage write errors
      }
      return { ok: true };
    }

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/login`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password }),
      });
      if (!response.ok) {
        return {
          ok: false,
          error: response.status === 401 ? '用户名或密码错误。' : '登录服务暂不可用，可开启右侧 debug 开关以本地模式进入。',
        };
      }
      const { user } = await response.json();
      const preset = Object.values(PRESET_SESSIONS).find((s) => s.username === user.username);
      if (!preset) return { ok: false, error: '账号角色尚未配置。' };
      setSession(applyServerAccess(preset,user));
      setIsAuthenticated(true);
      try {
        window.sessionStorage.removeItem(DEBUG_SESSION_KEY);
      } catch {
        // Ignore storage errors
      }
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: '无法连接登录数据库服务，可开启右侧 debug 开关使用本地校验进入系统。',
      };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      window.sessionStorage.removeItem(DEBUG_SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
    if (!debugMode) {
      void fetch(`${import.meta.env.BASE_URL}api/logout`, {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => {});
    }
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
    debugMode,
    setDebugMode,
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
