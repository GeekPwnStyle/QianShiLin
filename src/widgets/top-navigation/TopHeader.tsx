import { OperationStatus } from '@/src/shared/ui/OperationStatus';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  ChevronDown,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  Shield,
  Store,
  Upload,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  AVATAR_PRESET_STYLES,
  type AvatarColorPreset,
} from '@/src/modules/auth/domain/identity';
import { UserAvatar } from '@/src/modules/auth/ui/UserAvatar';
import {
  MAX_TOP_MODULE_SLOTS,
  resolveVisibleTopModuleIds,
  useNavigation,
} from '@/src/modules/navigation/application/NavigationContext';
import {
  FLAT_MENU_NODES,
  MENU_BY_ID,
  MENU_TREE,
  WORKBENCH_NODE,
  getAncestorChain,
  isNodeDevelopedForUser,
  type NavNode,
} from '@/src/modules/navigation/domain/menuRegistry';
import { formatDateTime } from '@/src/shared/lib/format';
import { Modal } from '@/src/shared/ui/Modal';
import { BrandLogoMark } from '@/src/shared/ui/BrandLogoMark';
import { Select } from '@/src/shared/ui/Select';
import { StatusLabel } from '@/src/shared/ui/StatusLabel';
import { ModuleIcon } from '@/src/widgets/top-navigation/ModuleIcon';
import { SYSTEM_THEMES } from '@/src/shared/theme/themes';
import { NoticeBell } from '@/src/modules/system/notices/ui/NoticeBell';

interface DragNavPayload {
  source: 'topbar' | 'all-modules';
  moduleId: string;
}

const DATA_SCOPE_LABEL: Record<string, string> = {
  all_stores: '全部授权门店数据（总部跨店全局范围）',
  assigned_stores: '仅限绑定所属门店范围',
  own_supplier: '仅限自身供应商商品、交付与往来账款',
};

const IDENTITY_LABEL: Record<string, string> = {
  admin: '总部管理员身份',
  store: '门店员工身份',
  supplier: '合作供应商身份',
};

export const TopHeader: React.FC = () => {
  const {
    session,
    currentRole,
    hasPermission,
    logout,
    updateTheme,
    themeSaving,
    profileError,
    updateAvatar,
    resetAvatar,
    switchStore,
  } = useAuth();
  const {
    activeModule,
    activeNode,
    allModulesOpen,
    setAllModulesOpen,
    headerVisible,
    setMobileDrawerOpen,
    pinnedModuleIds,
    draggingModuleId,
    setDraggingModuleId,
    reorderPinnedModules,
    replacePinnedModule,
    navigateToRoute,
    navigateToNode,
    navigateToModule,
  } = useNavigation();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [initialsDraft, setInitialsDraft] = useState(session.avatarInitials);
  const [dragOverModuleId, setDragOverModuleId] = useState<string | null>(null);

  // Expandable inline search in header
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [inlineQuery, setInlineQuery] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInitialsDraft(session.avatarInitials);
  }, [session.avatarInitials]);

  const visibleModules = useMemo(
    () => MENU_TREE.filter((mod) => hasPermission(mod.permission)),
    [hasPermission]
  );

  const visibleModuleIds = useMemo(
    () => visibleModules.map((m) => m.id),
    [visibleModules]
  );

  // Max 6 items in top bar: 工作台 (fixed #1) + up to 5 customizable L1 modules
  const displayedPrimaryModules = useMemo(() => {
    const resolvedIds = resolveVisibleTopModuleIds(pinnedModuleIds, visibleModuleIds);
    return resolvedIds
      .map((id) => MENU_BY_ID[id])
      .filter((mod): mod is NavNode => Boolean(mod));
  }, [pinnedModuleIds, visibleModuleIds]);

  const showAllMenusButton = visibleModules.length > MAX_TOP_MODULE_SLOTS;
  const activeOutsideTopBar = Boolean(
    activeModule && !displayedPrimaryModules.some((m) => m.id === activeModule.id)
  );
  const activeModuleDeveloped = activeModule
    ? isNodeDevelopedForUser(activeModule, hasPermission)
    : false;
  const workbenchDeveloped = isNodeDevelopedForUser(WORKBENCH_NODE, hasPermission);

  const effectiveHeaderVisible =
    headerVisible || searchExpanded || accountMenuOpen || allModulesOpen;

  // Live inline search results (only permitted menus)
  const inlineResults = useMemo(() => {
    const q = inlineQuery.trim().toLowerCase();
    const leaves = FLAT_MENU_NODES.filter(
      (n) =>
        (n.nodeType === 'page' || n.nodeType === 'tab') &&
        getAncestorChain(n.id).every((ancestor) => hasPermission(ancestor.permission))
    );
    if (!q) return leaves.slice(0, 8);
    return leaves
      .filter((node) => {
        const path = getAncestorChain(node.id)
          .map((c) => c.label)
          .join(' ');
        return (
          node.label.toLowerCase().includes(q) ||
          path.toLowerCase().includes(q) ||
          (node.description ?? '').toLowerCase().includes(q)
        );
      })
      .slice(0, 10);
  }, [inlineQuery, hasPermission]);

  useEffect(() => {
    if (searchExpanded) {
      const t = window.setTimeout(() => searchInputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [searchExpanded]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchExpanded(true);
      }
      if (e.key === 'Escape') {
        setSearchExpanded(false);
        setAccountMenuOpen(false);
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchExpanded(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  const handleSelectSearchNode = (node: NavNode) => {
    navigateToNode(node);
    setSearchExpanded(false);
    setInlineQuery('');
  };

  const handleDropOnModule = (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    setDragOverModuleId(null);
    setDraggingModuleId(null);
    const raw = e.dataTransfer.getData('application/x-qsl-nav');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragNavPayload;
      if (!payload?.moduleId) return;
      if (payload.source === 'topbar') {
        reorderPinnedModules(payload.moduleId, targetModuleId, visibleModuleIds);
      } else if (payload.source === 'all-modules') {
        replacePinnedModule(targetModuleId, payload.moduleId, visibleModuleIds);
      }
    } catch {
      // Ignore invalid drag payload
    }
  };

  const handleLogout = () => {
    setAccountMenuOpen(false);
    logout();
    navigateToRoute('/login');
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('请选择图片格式文件（JPG / PNG / WebP）。');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('图片大小请控制在 5MB 以内。');
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setAvatarError('图片读取失败，请重试。');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const size = 192;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          updateAvatar({ avatarUrl: result });
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const compressed = canvas.toDataURL('image/jpeg', 0.86);
        updateAvatar({ avatarUrl: compressed });
      };
      img.onerror = () => {
        setAvatarError('无法解析该图片文件，请更换其他图片。');
      };
      img.src = result;
    };
    reader.onerror = () => {
      setAvatarError('图片读取失败，请重试。');
    };
    reader.readAsDataURL(file);
  };

  const sensitiveItems = currentRole
    ? [
        { label: '查看进货成本价', allowed: currentRole.sensitiveFields.viewCostPrice },
        { label: '查看供货/批发价', allowed: currentRole.sensitiveFields.viewWholesalePrice },
        { label: '查看销售毛利率', allowed: currentRole.sensitiveFields.viewProfitMargin },
        { label: '查看明文手机号', allowed: currentRole.sensitiveFields.viewPlaintextPhone },
        { label: '批量数据导出', allowed: currentRole.sensitiveFields.batchExport },
      ]
    : [];

  return (
    <>
      <header
        className={`qsl-font-top fixed top-0 inset-x-0 z-50 h-16 bg-white/78 backdrop-blur-xl backdrop-saturate-150 shadow-[0_2px_16px_rgba(23,25,22,0.05)] transition-transform duration-200 ease-out ${
          effectiveHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="px-4 lg:px-6 h-full flex items-center justify-between gap-2 xl:gap-3">
          {/* Left: Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="打开模块菜单"
              className="lg:hidden w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-[#EAECE6] text-[#171916] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => navigateToRoute('/workbench')}
              className="flex items-center gap-2 text-left cursor-pointer shrink-0"
            >
              <BrandLogoMark size={30} />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[17px] font-bold tracking-tight text-[#171916] whitespace-nowrap">
                  千视林
                </span>
                <span className="text-[12px] font-medium text-[#73796F] tracking-wide hidden 2xl:inline">
                  Qianshilink
                </span>
              </div>
            </button>
          </div>

          {/* Center: Primary Level-1 Navigation (Max 6 items with left icons; 工作台 fixed, rest draggable/replaceable) */}
          <nav
            aria-label="一级业务模块导航"
            className="hidden lg:flex h-full items-center justify-center-safe gap-1.5 xl:gap-2 flex-1 min-w-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
          >
            {/* Fixed Slot 0: 工作台 (cannot be dragged or replaced) */}
            <button
              type="button"
              draggable={false}
              onClick={() => navigateToRoute('/workbench')}
              title={
                workbenchDeveloped
                  ? '工作台（固定首页入口，不可移动）'
                  : '工作台（暂未按真实需求开发，置灰预览；固定首页入口）'
              }
              className={`h-9 px-3 xl:px-3.5 rounded-full text-[14px] 2xl:text-[15px] leading-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 select-none border border-transparent transition-colors duration-150 cursor-pointer ${
                workbenchDeveloped
                  ? activeNode.id === 'workbench'
                    ? 'font-bold bg-[#171916] text-white'
                    : 'font-bold bg-transparent text-[#5F645D] hover:text-[#171916] hover:bg-[#F1F2EE]'
                  : activeNode.id === 'workbench'
                    ? 'font-medium bg-[#E4E7E0] text-[#5F645D] grayscale'
                    : 'font-medium bg-transparent text-[#A8ADA4] opacity-70 grayscale hover:opacity-90 hover:text-[#73796F] hover:bg-[#F1F2EE]/60'
              }`}
            >
              <ModuleIcon name="LayoutDashboard" className="w-4 h-4 shrink-0" />
              <span>工作台</span>
            </button>

            {/* Up to 5 draggable/replaceable L1 modules */}
            {displayedPrimaryModules.map((mod) => {
              const isActive = activeModule?.id === mod.id;
              const isDropTarget = dragOverModuleId === mod.id;
              const isBeingDragged = draggingModuleId === mod.id;
              const showDropHint = Boolean(draggingModuleId && draggingModuleId !== mod.id);
              const isDeveloped = isNodeDevelopedForUser(mod, hasPermission);

              return (
                <div
                  key={mod.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => {
                    setDraggingModuleId(mod.id);
                    e.dataTransfer.setData(
                      'application/x-qsl-nav',
                      JSON.stringify({ source: 'topbar', moduleId: mod.id } satisfies DragNavPayload)
                    );
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverModuleId !== mod.id) {
                      setDragOverModuleId(mod.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverModuleId((prev) => (prev === mod.id ? null : prev));
                    }
                  }}
                  onDrop={(e) => handleDropOnModule(e, mod.id)}
                  onDragEnd={() => {
                    setDraggingModuleId(null);
                    setDragOverModuleId(null);
                  }}
                  onClick={() => navigateToModule(mod.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigateToModule(mod.id);
                    }
                  }}
                  title={
                    isDeveloped
                      ? `${mod.label}（含已完成开发页面；点击切换，拖拽可调整顺序或接收全部菜单替换）`
                      : `${mod.label}（暂未按真实需求完成开发，置灰预览；点击浏览或拖拽调整顺序）`
                  }
                  className={`h-9 px-3 xl:px-3.5 rounded-full text-[14px] 2xl:text-[15px] leading-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 select-none border transition-colors duration-150 cursor-grab active:cursor-grabbing ${
                    isDropTarget
                      ? 'font-bold bg-[#D7FF00] text-[#171916] border-[#171916] ring-2 ring-[#171916]/25'
                      : isBeingDragged
                        ? 'font-bold opacity-50 border-dashed border-[#171916] bg-[#F1F2EE] text-[#171916]'
                        : isDeveloped
                          ? isActive
                            ? 'font-bold bg-[#171916] text-white border-transparent'
                            : showDropHint
                              ? 'font-bold bg-[#F8F9F5] text-[#171916] border-dashed border-[#171916]/40'
                              : 'font-bold bg-transparent text-[#5F645D] border-transparent hover:text-[#171916] hover:bg-[#F1F2EE]'
                          : isActive
                            ? 'font-medium bg-[#E4E7E0] text-[#5F645D] border-transparent grayscale'
                            : showDropHint
                              ? 'font-medium bg-[#F4F5F1] text-[#9EA39A] border-dashed border-[#AEB4AA]/60 grayscale'
                              : 'font-medium bg-transparent text-[#A8ADA4] opacity-70 grayscale border-transparent hover:opacity-90 hover:text-[#73796F] hover:bg-[#F1F2EE]/60'
                  }`}
                >
                  <ModuleIcon name={mod.icon} className="w-4 h-4 shrink-0 pointer-events-none" />
                  <span className="pointer-events-none">{mod.label}</span>
                </div>
              );
            })}

            {showAllMenusButton && (
              <button
                type="button"
                onClick={() => setAllModulesOpen(!allModulesOpen)}
                aria-expanded={allModulesOpen}
                className={`h-9 px-2.5 xl:px-3 rounded-full text-[13px] xl:text-[14px] font-bold leading-none whitespace-nowrap shrink-0 select-none inline-flex items-center justify-center gap-1.5 border transition-colors duration-150 cursor-pointer ml-0.5 ${
                  allModulesOpen
                    ? 'bg-[#D7FF00] text-[#171916] border-[#171916]'
                    : activeOutsideTopBar
                      ? activeModuleDeveloped
                        ? 'bg-[#ECF9A8] text-[#171916] border-[#171916]'
                        : 'bg-[#EAECE6] text-[#5F645D] border-[#C5CAC0]'
                      : 'bg-[#F8F9F5] text-[#171916] border-[#D9DDD4] hover:border-[#171916]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="hidden 2xl:inline">全部菜单</span>
                <span className="2xl:hidden">全部</span>
              </button>
            )}
          </nav>

          {/* Right: Search Icon (overlay) + Store + Notifications + Help + Account */}
          <div className="relative flex items-center gap-1.5 shrink-0">
            {searchExpanded && (
              <div
                ref={searchContainerRef}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-50 w-[300px] sm:w-[360px]"
              >
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-[#5F645D] absolute left-3.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={inlineQuery}
                    onChange={(e) => setInlineQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inlineResults.length > 0) {
                        handleSelectSearchNode(inlineResults[0]);
                      }
                    }}
                    placeholder="搜索菜单、功能或单据"
                    className="w-full h-10 pl-10 pr-10 rounded-full bg-white/88 backdrop-blur-xl border border-[#171916] text-[14px] text-[#171916] placeholder:text-[#73796F] outline-none shadow-md"
                  />
                  <button
                    type="button"
                    aria-label="收起搜索框"
                    onClick={() => {
                      setSearchExpanded(false);
                      setInlineQuery('');
                    }}
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[#5F645D] hover:text-[#171916] absolute right-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Live Dropdown Results */}
                  <div className="absolute right-0 top-12 w-full sm:w-96 qsl-glass-popover rounded-2xl p-2 z-50 max-h-[380px] overflow-y-auto qsl-scroll">
                    <div className="px-2.5 py-1.5 text-[13px] text-[#73796F] border-b border-[#171916]/[0.08] mb-1">
                      匹配功能路径（按 Enter 跳转首项）
                    </div>
                    {inlineResults.length === 0 ? (
                      <div className="py-6 text-center text-[14px] text-[#5F645D]">
                        未找到匹配菜单
                      </div>
                    ) : (
                      inlineResults.map((item) => {
                        const chain = getAncestorChain(item.id);
                        const modName = chain[0]?.label ?? '系统';
                        const fullPath = chain.map((c) => c.label).join(' / ');
                        const isDeveloped = isNodeDevelopedForUser(item, hasPermission);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectSearchNode(item)}
                            className={`w-full text-left px-3 py-2 rounded-xl hover:bg-[#F8F9F5] flex items-center justify-between gap-2 cursor-pointer ${
                              isDeveloped ? '' : 'opacity-60 grayscale hover:opacity-85'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[14px] font-medium truncate ${
                                    isDeveloped ? 'text-[#171916]' : 'text-[#73796F]'
                                  }`}
                                >
                                  {item.label}
                                </span>
                                <span className="text-[12px] text-[#73796F]">· {modName}</span>
                              </div>
                              <div className="text-[12px] text-[#73796F] truncate">{fullPath}</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#73796F] shrink-0" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Normal Right Controls (kept in flow invisibly while searchExpanded so container width never changes) */}
            <div
              className={`flex items-center gap-1.5 ${
                searchExpanded ? 'invisible pointer-events-none' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setSearchExpanded(true)}
                aria-label="展开菜单搜索"
                title="搜索菜单、功能或单据 (Ctrl/Cmd+K)"
                className="w-9 h-9 rounded-full inline-flex items-center justify-center hover:bg-[#F1F2EE] text-[#171916] cursor-pointer transition-colors"
              >
                <Search className="w-[17px] h-[17px]" />
              </button>

              {/* Mobile/Tablet All Menus quick trigger */}
              {showAllMenusButton && (
                <button
                  type="button"
                  onClick={() => setAllModulesOpen(!allModulesOpen)}
                  aria-label="全部菜单"
                  className="lg:hidden w-9 h-9 rounded-full inline-flex items-center justify-center hover:bg-[#F1F2EE] text-[#171916] cursor-pointer"
                >
                  <LayoutGrid className="w-[17px] h-[17px]" />
                </button>
              )}

              {/* Store / Org Switcher */}
              {session.identityType === 'supplier' ? (
                <div className="hidden xl:flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#F8F9F5] border border-[#D9DDD4] text-[13px] text-[#171916] max-w-[165px]">
                  <Store className="w-4 h-4 text-[#5F645D] shrink-0" />
                  <span className="truncate">{session.supplierName}</span>
                </div>
              ) : (
                <Select
                  ariaLabel="切换门店或组织范围"
                  variant="pill"
                  prefixIcon={<Store className="w-4 h-4 text-[#5F645D] shrink-0" />}
                  value={session.currentStoreId}
                  onChange={(val) => switchStore(val)}
                  className="hidden xl:block"
                  buttonClassName="max-w-[175px] 2xl:max-w-[210px]"
                  menuMinWidth={210}
                  align="right"
                  options={[
                    ...(session.identityType === 'admin'
                      ? [{ value: 'all', label: '全部授权门店 (4家)' }]
                      : []),
                    ...session.authorizedStores.map((st) => ({
                      value: st.id,
                      label: st.name,
                    })),
                  ]}
                />
              )}

              {/* Messages */}
              <NoticeBell />

              {/* Help */}
              <button
                type="button"
                onClick={() => navigateToRoute('/modules/help/docs')}
                aria-label="使用支持"
                title="使用支持与系统说明"
                className="hidden sm:inline-flex w-9 h-9 rounded-full items-center justify-center hover:bg-[#F1F2EE] text-[#171916] cursor-pointer"
              >
                <HelpCircle className="w-[17px] h-[17px]" />
              </button>

              {/* Account Menu: 个人信息 + 退出系统 */}
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen((p) => !p);
                              }}
                  className="h-9 pl-1 pr-2.5 rounded-full bg-[#F8F9F5] border border-[#D9DDD4] hover:border-[#A8B0A0] flex items-center gap-1.5 cursor-pointer"
                >
                  <UserAvatar session={session} size="sm" />
                  <span className="text-[13px] font-medium text-[#171916] hidden 2xl:inline whitespace-nowrap">
                    {session.displayName} · {session.roleName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#5F645D]" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 qsl-glass-popover rounded-2xl p-2 z-50">
                    <div className="px-3 py-2 border-b border-[#171916]/[0.08] mb-1 flex items-center gap-2.5">
                      <UserAvatar session={session} size="md" />
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold text-[#171916] truncate">
                          {session.displayName}
                        </div>
                        <div className="text-[13px] text-[#5F645D] truncate">
                          {session.roleName}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium text-[#171916] hover:bg-white/60 flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#5F645D]" />
                      <span>个人信息</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium text-[#DC2626] hover:bg-[#FEF2F2]/80 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>退出系统</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Personal Info & Detailed Role Modal */}
      <Modal
        open={profileModalOpen}
        onClose={() => {
          setAvatarError(null);
          setProfileModalOpen(false);
        }}
        title="个人信息与角色详情"
        subtitle={`当前登录账号：${session.username}`}
        maxWidthClass="max-w-5xl"
      >
        <div className="space-y-5 text-[15px]">
          {/* Avatar Editor + Basic Account Details */}
          <div className="p-4 rounded-2xl bg-white/65 border border-[#171916]/[0.08] flex flex-col lg:flex-row gap-5 lg:items-center">
            {/* Avatar Editor Section */}
            <div className="flex items-center gap-4 lg:pr-5 lg:border-r lg:border-[#171916]/[0.08] shrink-0">
              <div className="relative group">
                <UserAvatar session={session} size="xl" />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  aria-label="更换头像图片"
                  title="点击上传自定义头像"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#171916] text-[#D7FF00] border-2 border-white inline-flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="h-8 px-3 rounded-full bg-[#171916] text-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-[#2F332D] transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>上传图片</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarError(null);
                      resetAvatar();
                    }}
                    title="恢复默认文字头像"
                    className="h-8 px-2.5 rounded-full bg-white/80 border border-[#171916]/12 text-[#5F645D] hover:text-[#171916] text-[13px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>恢复默认</span>
                  </button>
                </div>

                {/* Color Presets & Custom Initials */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5" role="group" aria-label="文字头像配色">
                    {(Object.keys(AVATAR_PRESET_STYLES) as AvatarColorPreset[]).map((presetKey) => {
                      const preset = AVATAR_PRESET_STYLES[presetKey];
                      const active =
                        !session.avatarUrl &&
                        (session.avatarColorPreset ?? 'charcoal') === presetKey;
                      return (
                        <button
                          key={presetKey}
                          type="button"
                          title={`使用「${preset.label}」风格`}
                          aria-label={`使用${preset.label}头像配色`}
                          onClick={() => {
                            setAvatarError(null);
                            updateAvatar({
                              avatarUrl: null,
                              avatarColorPreset: presetKey,
                            });
                          }}
                          style={{ backgroundColor: preset.swatchCss }}
                          className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                            active
                              ? 'ring-2 ring-[#171916] ring-offset-1 scale-110 border-white'
                              : 'border-[#171916]/20 hover:scale-110'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    maxLength={2}
                    value={initialsDraft}
                    aria-label="自定义头像文字缩写"
                    placeholder="缩写"
                    onChange={(e) => {
                      const val = e.target.value;
                      setInitialsDraft(val);
                      if (val.trim()) {
                        updateAvatar({ avatarInitials: val.trim() });
                      }
                    }}
                    className="w-14 h-7 px-2 rounded-lg bg-white/85 border border-[#171916]/12 text-[13px] text-center font-semibold text-[#171916] outline-none focus:border-[#171916]"
                  />
                </div>

                {avatarError && (
                  <OperationStatus role="alert">{avatarError}</OperationStatus>
                )}
              </div>
            </div>

            {/* Wide 4-column Basic Account Info */}
            <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[13px] text-[#73796F]">员工姓名</div>
                <div className="font-bold text-[#171916] mt-0.5">{session.displayName}</div>
              </div>
              <div>
                <div className="text-[13px] text-[#73796F]">登录用户名</div>
                <div className="font-mono font-medium text-[#171916] mt-0.5">{session.username}</div>
              </div>
              <div>
                <div className="text-[13px] text-[#73796F]">岗位与头衔</div>
                <div className="font-medium text-[#171916] mt-0.5">{session.title}</div>
              </div>
              <div>
                <div className="text-[13px] text-[#73796F]">身份类型</div>
                <div className="mt-1">
                  <StatusLabel
                    tone={
                      session.identityType === 'admin'
                        ? 'processing'
                        : session.identityType === 'supplier'
                          ? 'warning'
                          : 'success'
                    }
                    label={IDENTITY_LABEL[session.identityType] ?? session.identityType}
                  />
                </div>
              </div>
              <div className="col-span-2 sm:col-span-4 pt-2.5 border-t border-[#171916]/[0.07] flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[13px] text-[#73796F] shrink-0">当前数据范围与门店</span>
                <span className="font-medium text-[#171916]">{session.currentStoreName}</span>
                {session.authorizedStores.length > 0 && (
                  <span className="text-[13px] text-[#5F645D]">
                    （授权门店：{session.authorizedStores.map((s) => s.name).join('、')}）
                  </span>
                )}
              </div>
            </div>
          </div>

          <section className="space-y-3" aria-label="主题色设置">
            <h3 className="text-[17px] font-bold">主题色设置</h3>
            <p className="text-sm text-[#73796F]">选择后立即应用，并自动保存到当前账号。</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SYSTEM_THEMES.map(theme => <button key={theme.key} type="button" disabled={themeSaving} aria-pressed={session.themeKey === theme.key} onClick={() => void updateTheme(theme.key)} className={`flex items-center gap-3 rounded-xl border p-4 text-left disabled:opacity-60 ${session.themeKey === theme.key ? 'border-[#171916] ring-1 ring-[#171916]' : 'border-[#D9DDD4]'}`}>
                <span className="h-9 w-9 shrink-0 rounded-lg border border-black/10" style={{background: theme.accentHex}} />
                <span><span className="block font-semibold">{theme.name}</span><span className="block text-xs text-[#73796F]">{theme.subtitle}</span></span>
                {session.themeKey === theme.key && <span className="ml-auto text-xs shrink-0">已选</span>}
              </button>)}
            </div>
            {themeSaving && <OperationStatus role="status" loading>正在保存主题…</OperationStatus>}
            {profileError && <OperationStatus role="alert">{profileError}</OperationStatus>}
          </section>

          {/* Role Details - Balanced Wide 2-Column Layout */}
          {currentRole && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#171916]/[0.08]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#171916]" />
                  <h3 className="text-[17px] font-bold text-[#171916]">
                    所属角色：{currentRole.name}
                  </h3>
                </div>
                <span className="text-[13px] font-mono text-[#73796F]">{currentRole.id}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Description + Policy + Updated */}
                <div className="lg:col-span-6 space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="text-[13px] text-[#73796F]">角色职责与权限描述</div>
                    <p className="text-[14px] text-[#171916] leading-relaxed bg-white/55 p-3.5 rounded-xl border border-[#171916]/[0.08]">
                      {currentRole.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px]">
                    <div className="p-3.5 rounded-xl bg-white/55 border border-[#171916]/[0.08]">
                      <div className="text-[13px] text-[#73796F]">数据范围策略</div>
                      <div className="font-medium text-[#171916] mt-1">
                        {DATA_SCOPE_LABEL[currentRole.dataScope] ?? currentRole.dataScope}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/55 border border-[#171916]/[0.08]">
                      <div className="text-[13px] text-[#73796F]">最近权限更新</div>
                      <div className="font-medium text-[#171916] mt-1 tabular-nums">
                        {currentRole.updatedBy} · {formatDateTime(currentRole.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Sensitive Field Controls + Permission Codes */}
                <div className="lg:col-span-6 space-y-3.5">
                  <div>
                    <div className="text-[13px] text-[#73796F] mb-1.5">敏感字段控制策略</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sensitiveItems.map((item) => (
                        <div
                          key={item.label}
                          className="px-3 py-2 rounded-xl border border-[#171916]/[0.08] bg-white/60 flex items-center justify-between gap-2 text-[14px]"
                        >
                          <span className="text-[#171916]">{item.label}</span>
                          <StatusLabel
                            tone={item.allowed ? 'success' : 'neutral'}
                            label={item.allowed ? '已授权' : '已隔离'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[13px] text-[#73796F] mb-1.5">
                      <span>已授予功能权限编码</span>
                      <span className="tabular-nums">共 {currentRole.permissions.length} 项</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto qsl-scroll p-3 rounded-xl bg-white/55 border border-[#171916]/[0.08] flex flex-wrap gap-1.5">
                      {currentRole.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 rounded-md bg-white/75 border border-[#171916]/10 text-[12px] font-mono text-[#171916]"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
