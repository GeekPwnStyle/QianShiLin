import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  MENU_BY_ID,
  MENU_BY_ROUTE,
  MENU_TREE,
  WORKBENCH_NODE,
  findFirstAccessibleLeaf,
  findFirstLeafRegardlessOfPerm,
  getAncestorChain,
  type NavNode,
} from '@/src/modules/navigation/domain/menuRegistry';
import { useAuth } from '@/src/modules/auth/application/AuthContext';

export const MAX_TOP_MODULE_SLOTS = 5; // 工作台(1固定) + 最多5个可配置一级模块 = 顶部最多6个菜单项
const TOP_MODULES_STORAGE_KEY = 'qsl_pinned_top_modules_v2';
const DEFAULT_PINNED_MODULE_IDS = MENU_TREE.slice(0, MAX_TOP_MODULE_SLOTS).map((m) => m.id);

function readPinnedMap(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TOP_MODULES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function loadPinnedModulesForRole(roleId: string): string[] {
  const saved = readPinnedMap()[roleId];
  if (!Array.isArray(saved)) return DEFAULT_PINNED_MODULE_IDS;
  const validIds = saved.filter(
    (id): id is string => typeof id === 'string' && MENU_TREE.some((m) => m.id === id)
  );
  const deduped = Array.from(new Set(validIds));
  for (const fallbackId of MENU_TREE.map((m) => m.id)) {
    if (deduped.length >= MAX_TOP_MODULE_SLOTS) break;
    if (!deduped.includes(fallbackId)) deduped.push(fallbackId);
  }
  return deduped.slice(0, MAX_TOP_MODULE_SLOTS);
}

interface NavigationContextValue {
  currentRoute: string;
  activeNode: NavNode;
  activeModule: NavNode | null;
  breadcrumbs: NavNode[];
  isLoginRoute: boolean;
  allModulesOpen: boolean;
  setAllModulesOpen: (open: boolean) => void;
  headerVisible: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  favorites: string[];
  toggleFavorite: (nodeId: string) => void;
  pinnedModuleIds: string[];
  draggingModuleId: string | null;
  setDraggingModuleId: (moduleId: string | null) => void;
  reorderPinnedModules: (sourceModuleId: string, targetModuleId: string, visibleModuleIds: string[]) => void;
  replacePinnedModule: (targetSlotModuleId: string, incomingModuleId: string, visibleModuleIds: string[]) => void;
  resetPinnedModules: () => void;
  navigateToRoute: (route: string) => void;
  navigateToNode: (node: NavNode) => void;
  navigateToModule: (moduleId: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

function resolveInitialRoute(): string {
  if (typeof window === 'undefined') return '/workbench';
  const path = window.location.pathname;
  if (path === '/' || path === '') return '/workbench';
  return path;
}

export function resolveVisibleTopModuleIds(
  pinnedModuleIds: string[],
  visibleModuleIds: string[]
): string[] {
  const result = pinnedModuleIds.filter((id) => visibleModuleIds.includes(id));
  for (const id of visibleModuleIds) {
    if (result.length >= MAX_TOP_MODULE_SLOTS) break;
    if (!result.includes(id)) result.push(id);
  }
  return result.slice(0, MAX_TOP_MODULE_SLOTS);
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasPermission, session } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>(resolveInitialRoute);
  const [allModulesOpen, setAllModulesOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [pinnedModuleIds, setPinnedModuleIds] = useState<string[]>(() =>
    loadPinnedModulesForRole(session.roleId)
  );
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([
    'members.followup.notifications',
    'basic.product.list',
    'sales.pos',
    'members.profile.basic',
  ]);

  useEffect(() => {
    setPinnedModuleIds(loadPinnedModulesForRole(session.roleId));
  }, [session.roleId]);

  useEffect(() => {
    try {
      const map = readPinnedMap();
      map[session.roleId] = pinnedModuleIds;
      window.localStorage.setItem(TOP_MODULES_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage quota errors in prototype mode
    }
  }, [pinnedModuleIds, session.roleId]);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      setCurrentRoute(path === '/' || path === '' ? '/workbench' : path);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAllModulesOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY <= 12) {
        setHeaderVisible(true);
      } else if (currentY > lastY + 6 && currentY > 64 && !allModulesOpen) {
        setHeaderVisible(false);
      } else if (currentY < lastY - 4) {
        setHeaderVisible(true);
      }
      lastY = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [allModulesOpen]);

  const isLoginRoute = currentRoute === '/login';

  const activeNode: NavNode = useMemo(() => {
    if (currentRoute === '/workbench' || currentRoute === '/login') {
      return WORKBENCH_NODE;
    }
    const exact = MENU_BY_ROUTE[currentRoute];
    if (exact) {
      if (exact.nodeType === 'module' || exact.nodeType === 'group') {
        return findFirstLeafRegardlessOfPerm(exact);
      }
      return exact;
    }
    return WORKBENCH_NODE;
  }, [currentRoute]);

  const activeModule: NavNode | null = useMemo(() => {
    if (activeNode.id === 'workbench') return null;
    return MENU_TREE.find((m) => m.id === activeNode.moduleId) ?? null;
  }, [activeNode]);

  const breadcrumbs = useMemo(() => {
    if (activeNode.id === 'workbench') return [WORKBENCH_NODE];
    return getAncestorChain(activeNode.id);
  }, [activeNode]);

  const pushHistory = useCallback((route: string) => {
    if (typeof window !== 'undefined' && window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    setCurrentRoute(route);
    setMobileDrawerOpen(false);
    setAllModulesOpen(false);
    setHeaderVisible(true);
  }, []);

  const navigateToRoute = useCallback(
    (route: string) => {
      pushHistory(route);
    },
    [pushHistory]
  );

  const navigateToNode = useCallback(
    (node: NavNode) => {
      if (node.nodeType === 'page' && node.children && node.children.length > 0) {
        const firstTab = node.children[0];
        pushHistory(firstTab.route);
        return;
      }
      if (node.nodeType === 'module' || node.nodeType === 'group') {
        const leaf =
          findFirstAccessibleLeaf(node, hasPermission) ?? findFirstLeafRegardlessOfPerm(node);
        pushHistory(leaf.route);
        return;
      }
      pushHistory(node.route);
    },
    [hasPermission, pushHistory]
  );

  const navigateToModule = useCallback(
    (moduleId: string) => {
      const mod = MENU_BY_ID[moduleId];
      if (!mod) return;
      const leaf =
        findFirstAccessibleLeaf(mod, hasPermission) ?? findFirstLeafRegardlessOfPerm(mod);
      pushHistory(leaf.route);
    },
    [hasPermission, pushHistory]
  );

  const toggleFavorite = useCallback((nodeId: string) => {
    setFavorites((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  }, []);

  const reorderPinnedModules = useCallback(
    (sourceModuleId: string, targetModuleId: string, visibleModuleIds: string[]) => {
      if (sourceModuleId === targetModuleId) return;
      setPinnedModuleIds((prev) => {
        const activeSlots = resolveVisibleTopModuleIds(prev, visibleModuleIds);
        const fromIdx = activeSlots.indexOf(sourceModuleId);
        const toIdx = activeSlots.indexOf(targetModuleId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const nextSlots = [...activeSlots];
        const [moved] = nextSlots.splice(fromIdx, 1);
        nextSlots.splice(toIdx, 0, moved);
        // Preserve any non-visible pinned ids after active slots
        const hidden = prev.filter((id) => !visibleModuleIds.includes(id));
        return [...nextSlots, ...hidden];
      });
    },
    []
  );

  const replacePinnedModule = useCallback(
    (targetSlotModuleId: string, incomingModuleId: string, visibleModuleIds: string[]) => {
      if (targetSlotModuleId === incomingModuleId) return;
      if (!visibleModuleIds.includes(incomingModuleId)) return;
      setPinnedModuleIds((prev) => {
        const activeSlots = resolveVisibleTopModuleIds(prev, visibleModuleIds);
        const targetIdx = activeSlots.indexOf(targetSlotModuleId);
        if (targetIdx === -1) return prev;

        const nextSlots = [...activeSlots];
        const existingIncomingIdx = nextSlots.indexOf(incomingModuleId);
        if (existingIncomingIdx !== -1) {
          // Swap positions if already pinned in top bar
          nextSlots[existingIncomingIdx] = targetSlotModuleId;
          nextSlots[targetIdx] = incomingModuleId;
        } else {
          // Replace the target fixed slot with the incoming module
          nextSlots[targetIdx] = incomingModuleId;
        }
        const hidden = prev.filter((id) => !visibleModuleIds.includes(id));
        return [...nextSlots, ...hidden];
      });
    },
    []
  );

  const resetPinnedModules = useCallback(() => {
    setPinnedModuleIds(DEFAULT_PINNED_MODULE_IDS);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        currentRoute,
        activeNode,
        activeModule,
        breadcrumbs,
        isLoginRoute,
        allModulesOpen,
        setAllModulesOpen,
        headerVisible,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileDrawerOpen,
        setMobileDrawerOpen,
        favorites,
        toggleFavorite,
        pinnedModuleIds,
        draggingModuleId,
        setDraggingModuleId,
        reorderPinnedModules,
        replacePinnedModule,
        resetPinnedModules,
        navigateToRoute,
        navigateToNode,
        navigateToModule,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used inside NavigationProvider');
  return ctx;
}
