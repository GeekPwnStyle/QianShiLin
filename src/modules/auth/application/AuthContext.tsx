import { setActiveStoreScope } from '@/src/infrastructure/http/storeScope';
import { PasswordReminder } from '@/src/modules/auth/ui/PasswordReminder';
import { refreshStoreProfilesFromServer } from '@/src/modules/system/stores/domain/storeProfile';
import { useSessionIdle } from './useSessionIdle';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_ROLES,
  LOGIN_ACCOUNTS,
  PRESET_SESSIONS,
  STORE_CATALOG,
  SUPPLIER_CATALOG,
  checkPermission,
  type AuthSession,
  type AvatarColorPreset,
  type IdentityType,
  type RoleDefinition,
  type StoreSubRole,
} from '@/src/modules/auth/domain/identity';
import { appRepositories } from '@/src/app/composition/container';
import {
  DEFAULT_THEME_KEY,
  applyThemeToDocument,
  resolveThemeKey,
  type ThemeKey,
} from '@/src/shared/theme/themes';
import type { DataScopeContext } from '@/src/shared/types/common';

const AVATAR_STORAGE_KEY = 'qsl_user_avatars_v1';
const LAST_THEME_STORAGE_KEY = 'qsl_last_theme_v1';
const DEBUG_MODE_STORAGE_KEY = 'qsl_auth_debug_mode_v1';
const DEBUG_SESSION_KEY = 'qsl_debug_auth_preset_v1';

function loadInitialDebugMode(): boolean { return false; }

function loadLastTheme(): ThemeKey {
  if (typeof window === 'undefined') return DEFAULT_THEME_KEY;
  try {
    return resolveThemeKey(window.localStorage.getItem(LAST_THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_KEY;
  }
}

function saveLastTheme(themeKey: ThemeKey): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_THEME_STORAGE_KEY, themeKey);
  } catch {
    // Ignore storage write errors
  }
}

interface SavedUserPref {
  avatarUrl?: string;
  avatarInitials?: string;
  avatarColorPreset?: AvatarColorPreset;
  themeKey?: ThemeKey;
}

function readUserPrefMap(): Record<string, SavedUserPref> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, SavedUserPref>) : {};
  } catch {
    return {};
  }
}

function writeUserPref(username: string, patch: Partial<SavedUserPref> & { resetAvatar?: boolean }): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readUserPrefMap();
    const prev = map[username] ?? {};
    const next: SavedUserPref = patch.resetAvatar
      ? { ...(prev.themeKey ? { themeKey: prev.themeKey } : {}) }
      : {
          ...prev,
          ...patch,
        };
    if (!patch.resetAvatar && patch.avatarUrl === undefined && 'avatarUrl' in patch) {
      delete next.avatarUrl;
    }
    map[username] = next;
    window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function applySavedDebugPrefs(base: AuthSession): AuthSession {
  const saved = readUserPrefMap()[base.username];
  if (!saved) return base;
  return {
    ...base,
    avatarUrl: saved.avatarUrl ?? base.avatarUrl,
    avatarInitials: saved.avatarInitials?.trim() || base.avatarInitials,
    avatarColorPreset: saved.avatarColorPreset ?? base.avatarColorPreset,
    themeKey: resolveThemeKey(saved.themeKey ?? base.themeKey),
  };
}

export interface ServerUser {
  must_change_password?: boolean;
  is_system_admin?: boolean;
  id: string;
  username: string;
  display_name?: string | null;
  email?: string | null;
  title?: string | null;
  avatar_initials?: string | null;
  avatar_url?: string | null;
  avatar_color_preset?: AvatarColorPreset | null;
  theme_key?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  identity_type?: IdentityType | null;
  sub_role?: StoreSubRole | null;
  store_ids?: string[] | null;
  permission_denies?: string[] | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
}

function resolveAuthorizedStores(storeIds: string[] | null | undefined) {
  if (!Array.isArray(storeIds)) return [];
  return storeIds.map((id) => {
    const found = STORE_CATALOG.find((store) => store.id === id);
    if (found) return found;
    return { id, name: id, code: id, region: '系统授权门店' };
  });
}

function buildSessionFromServerUser(user: ServerUser): AuthSession {
  const fallbackPreset = Object.values(PRESET_SESSIONS).find((s) => s.username === user.username);
  const roleId = user.role_id ?? fallbackPreset?.roleId ?? 'role_store_guide';
  const defaultRoleMeta = DEFAULT_ROLES.find((r) => r.id === roleId);
  const identityType: IdentityType =
    user.identity_type ?? defaultRoleMeta?.identityType ?? fallbackPreset?.identityType ?? 'store';
  const roleName = user.role_name ?? defaultRoleMeta?.name ?? fallbackPreset?.roleName ?? '门店员工';
  const subRole = user.sub_role ?? defaultRoleMeta?.subRole ?? fallbackPreset?.subRole;

  const displayName = user.display_name?.trim() || fallbackPreset?.displayName || user.username;
  const title = user.title?.trim() || fallbackPreset?.title || roleName;
  const avatarInitials =
    user.avatar_initials?.trim() ||
    fallbackPreset?.avatarInitials ||
    displayName.slice(0, 1) ||
    user.username.slice(0, 1).toUpperCase();

  const allowedStores =
    user.store_ids !== null && user.store_ids !== undefined
      ? resolveAuthorizedStores(user.store_ids)
      : fallbackPreset?.authorizedStores ?? [];

  const supplierId = user.supplier_id ?? (identityType === 'supplier' ? fallbackPreset?.supplierId ?? SUPPLIER_CATALOG[0].id : undefined);
  const supplierName =
    user.supplier_name ??
    (identityType === 'supplier'
      ? fallbackPreset?.supplierName ?? SUPPLIER_CATALOG[0].name
      : undefined);

  const isAdmin = identityType === 'admin';
  const isSupplier = identityType === 'supplier';

  const currentStoreId = isAdmin
    ? 'all'
    : isSupplier
      ? 'supplier_scope'
      : allowedStores[0]?.id ?? fallbackPreset?.currentStoreId ?? 'store_hq_01';

  const currentStoreName = isAdmin
    ? `全部授权门店 (${allowedStores.length}家)`
    : isSupplier
      ? supplierName ?? '合作供应商'
      : allowedStores[0]?.name ?? fallbackPreset?.currentStoreName ?? '未分配门店';

  return {
    userId: user.id,
    username: user.username,
    displayName,
    email: user.email ?? fallbackPreset?.email,
    title,
    avatarInitials,
    avatarUrl: user.avatar_url ?? undefined,
    avatarColorPreset: user.avatar_color_preset ?? 'charcoal',
    themeKey: resolveThemeKey(user.theme_key),
    identityType,
    roleId,
    roleName,
    subRole,
    currentStoreId,
    currentStoreName,
    authorizedStores: isSupplier ? [] : allowedStores,
    permissionDenies: user.permission_denies ?? [],
    supplierId,
    supplierName,
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

interface ProfileSaveResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  authLoading: boolean;
  permissionsLoading: boolean;
  permissionsError: boolean;
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  session: AuthSession;
  currentRole: RoleDefinition | undefined;
  allRoles: RoleDefinition[];
  dataScope: DataScopeContext;
  themeSaving: boolean;
  profileSaving: boolean;
  profileError: string | null;
  loginWithCredentials: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  updateTheme: (themeKey: ThemeKey) => Promise<ProfileSaveResult>;
  updateAvatar: (patch: AvatarUpdatePatch) => Promise<ProfileSaveResult>;
  resetAvatar: () => Promise<ProfileSaveResult>;
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
  const [session, setSession] = useState<AuthSession>(() => ({
    ...PRESET_SESSIONS.admin,
    themeKey: loadLastTheme(),
  }));
  setActiveStoreScope(session.identityType==='supplier'?'all':session.currentStoreId);
  useSessionIdle(isAuthenticated && !debugMode, session.userId, () => { setIsAuthenticated(false); queryClient.clear(); });
  useEffect(() => {
    const update=()=>setSession(prev=>{
      const ids=prev.identityType==='admin'?STORE_CATALOG.map(s=>s.id):prev.authorizedStores.map(s=>s.id);
      return {...prev,authorizedStores:resolveAuthorizedStores(ids),currentStoreName:STORE_CATALOG.find(s=>s.id===prev.currentStoreId)?.name??prev.currentStoreName};
    });
    window.addEventListener('qsl-stores-changed',update);return()=>window.removeEventListener('qsl-stores-changed',update);
  },[]);
  const [themeSaving, setThemeSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const activeTheme = resolveThemeKey(session.themeKey);
    applyThemeToDocument(activeTheme);
    saveLastTheme(activeTheme);
  }, [session.themeKey]);

  const setDebugMode = (enabled: boolean) => {
    setDebugModeState(false);
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
          setSession(applySavedDebugPrefs(PRESET_SESSIONS[savedPreset]));
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
        if (active && user?.id) {
          await refreshStoreProfilesFromServer();
          try { sessionStorage.removeItem('qsl_session_expired'); } catch {}
      setSession(buildSessionFromServerUser(user));
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

  const { data: allRoles = [], refetch, isPending: rolesPending, isError: rolesError, isFetching: rolesFetching } = useQuery({
    queryKey: ['rbac', 'roles', debugMode, isAuthenticated ? session.userId : null],
    queryFn: () => appRepositories.roles.listRoles(),
    enabled: debugMode || isAuthenticated,
  });

  const currentRole = useMemo(() => {
    const role = allRoles.find((r) => r.id === session.roleId);
    return role
      ? {
          ...role,
          permissions: role.permissions.filter(
            (code) => !session.permissionDenies?.includes(code)
          ),
        }
      : undefined;
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

  const persistServerProfile = async (payload: {
    themeKey?: ThemeKey;
    avatarUrl?: string | null;
    avatarInitials?: string;
    avatarColorPreset?: AvatarColorPreset;
  }): Promise<ProfileSaveResult> => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/account/profile`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: typeof data?.error === 'string' ? data.error : `保存失败（${response.status}）`,
        };
      }
      if (data?.profile) {
        setSession((prev) => ({
          ...prev,
          title: data.profile.title ?? prev.title,
          avatarInitials: data.profile.avatar_initials ?? prev.avatarInitials,
          avatarUrl: data.profile.avatar_url ?? undefined,
          avatarColorPreset: data.profile.avatar_color_preset ?? prev.avatarColorPreset,
          themeKey: resolveThemeKey(data.profile.theme_key ?? prev.themeKey),
        }));
      }
      return { ok: true };
    } catch {
      return { ok: false, error: '无法连接服务器保存个人偏好，请稍后重试。' };
    }
  };

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

      setSession(applySavedDebugPrefs(PRESET_SESSIONS[matched.presetKey]));
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
          error:
            response.status === 401
              ? '用户名或密码错误。'
              : '登录服务暂不可用，可开启右侧 debug 开关以本地模式进入。',
        };
      }
      const { user }: { user?: ServerUser } = await response.json();
      if (!user?.id) return { ok: false, error: '登录返回用户信息异常。' };
      await refreshStoreProfilesFromServer();
      if (!user.role_id) return { ok: false, error: '账号角色尚未在数据库中配置。' };
      setSession(buildSessionFromServerUser(user));
      setIsAuthenticated(true);
      if(user.must_change_password) window.dispatchEvent(new Event('qsl-password-reminder'));
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
    setProfileError(null);
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

  const updateTheme = async (themeKey: ThemeKey): Promise<ProfileSaveResult> => {
    const previousTheme = session.themeKey;
    setProfileError(null);
    setSession((prev) => ({ ...prev, themeKey }));

    if (debugMode) {
      writeUserPref(session.username, { themeKey });
      return { ok: true };
    }

    setThemeSaving(true);
    const result = await persistServerProfile({ themeKey });
    setThemeSaving(false);
    if (!result.ok) {
      setSession((prev) => ({ ...prev, themeKey: previousTheme }));
      setProfileError(result.error ?? '主题保存失败');
    }
    return result;
  };

  const updateAvatar = async (patch: AvatarUpdatePatch): Promise<ProfileSaveResult> => {
    setProfileError(null);
    const prevSnapshot = {
      avatarUrl: session.avatarUrl,
      avatarInitials: session.avatarInitials,
      avatarColorPreset: session.avatarColorPreset,
    };

    const nextUrl =
      patch.avatarUrl === null
        ? undefined
        : patch.avatarUrl !== undefined
          ? patch.avatarUrl
          : session.avatarUrl;
    const defaultInitials =
      session.displayName.slice(0, 1) || session.username.slice(0, 1).toUpperCase();
    const nextInitials =
      patch.avatarInitials !== undefined
        ? patch.avatarInitials.trim().slice(0, 2) || defaultInitials
        : session.avatarInitials;
    const nextPreset = patch.avatarColorPreset ?? session.avatarColorPreset ?? 'charcoal';

    setSession((prev) => ({
      ...prev,
      avatarUrl: nextUrl,
      avatarInitials: nextInitials,
      avatarColorPreset: nextPreset,
    }));

    if (debugMode) {
      writeUserPref(session.username, {
        avatarUrl: nextUrl,
        avatarInitials: nextInitials,
        avatarColorPreset: nextPreset,
      });
      return { ok: true };
    }

    setProfileSaving(true);
    const result = await persistServerProfile({
      avatarUrl: patch.avatarUrl === null ? null : nextUrl,
      avatarInitials: nextInitials,
      avatarColorPreset: nextPreset,
    });
    setProfileSaving(false);
    if (!result.ok) {
      setSession((prev) => ({ ...prev, ...prevSnapshot }));
      setProfileError(result.error ?? '头像保存失败');
    }
    return result;
  };

  const resetAvatar = async (): Promise<ProfileSaveResult> => {
    setProfileError(null);
    const defaultInitials =
      Object.values(PRESET_SESSIONS).find((s) => s.username === session.username)?.avatarInitials ??
      (session.displayName.slice(0, 1) || session.username.slice(0, 1).toUpperCase());
    const prevSnapshot = {
      avatarUrl: session.avatarUrl,
      avatarInitials: session.avatarInitials,
      avatarColorPreset: session.avatarColorPreset,
    };

    setSession((prev) => ({
      ...prev,
      avatarUrl: undefined,
      avatarInitials: defaultInitials,
      avatarColorPreset: 'charcoal',
    }));

    if (debugMode) {
      writeUserPref(session.username, { resetAvatar: true });
      return { ok: true };
    }

    setProfileSaving(true);
    const result = await persistServerProfile({
      avatarUrl: null,
      avatarInitials: defaultInitials,
      avatarColorPreset: 'charcoal',
    });
    setProfileSaving(false);
    if (!result.ok) {
      setSession((prev) => ({ ...prev, ...prevSnapshot }));
      setProfileError(result.error ?? '重置头像失败');
    }
    return result;
  };

  // Identity switching is disabled once credentials are verified by the API.
  const switchPresetIdentity = (_presetKey: string) => {};

  const switchStore = (storeId: string) => {
    if (storeId === 'all' && session.identityType === 'admin') {
      setActiveStoreScope('all');queryClient.clear();
      setSession((prev) => ({
        ...prev,
        currentStoreId: 'all',
        currentStoreName: `全部授权门店 (${prev.authorizedStores.length}家)`,
      }));
      return;
    }
    const target = session.authorizedStores.find((s) => s.id === storeId);
    if (!target) return;
    setActiveStoreScope(target.id);queryClient.clear();
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
    permissionsLoading: isAuthenticated && (rolesPending || (rolesError && rolesFetching)),
    permissionsError: isAuthenticated && rolesError && !allRoles.length,
    debugMode,
    setDebugMode,
    session,
    currentRole,
    allRoles,
    dataScope,
    themeSaving,
    profileSaving,
    profileError,
    loginWithCredentials,
    logout,
    updateTheme,
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

  return <AuthContext.Provider value={value}>{children}<PasswordReminder authenticated={isAuthenticated} /></AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
