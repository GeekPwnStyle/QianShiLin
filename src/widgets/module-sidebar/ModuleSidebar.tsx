import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { useNavigation } from '@/src/modules/navigation/application/NavigationContext';
import {
  MENU_BY_ID,
  isNodeDevelopedForUser,
  type NavNode,
} from '@/src/modules/navigation/domain/menuRegistry';
import { L2MenuIcon } from '@/src/widgets/top-navigation/ModuleIcon';

export const ModuleSidebar: React.FC = () => {
  const { hasPermission } = useAuth();
  const {
    activeModule,
    activeNode,
    headerVisible,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    favorites,
    navigateToNode,
  } = useNavigation();

  const [moduleSearch, setModuleSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [favoritesHovered, setFavoritesHovered] = useState(false);

  useEffect(() => {
    setModuleSearch('');
    if (activeNode.parentId) {
      setExpandedGroups((prev) => ({
        ...prev,
        [activeNode.parentId!]: true,
      }));
      const parent = MENU_BY_ID[activeNode.parentId];
      if (parent?.parentId) {
        setExpandedGroups((prev) => ({
          ...prev,
          [parent.parentId!]: true,
        }));
      }
    }
  }, [activeNode.id, activeNode.parentId]);

  const l2Items = useMemo(() => {
    if (!activeModule?.children) return [];
    const q = moduleSearch.trim().toLowerCase();
    return activeModule.children
      .filter((item) => hasPermission(item.permission))
      .filter((item) => {
        if (!q) return true;
        const selfMatch = item.label.toLowerCase().includes(q);
        const childMatch = item.children?.some((c) => c.label.toLowerCase().includes(q));
        return selfMatch || childMatch;
      });
  }, [activeModule, hasPermission, moduleSearch]);

  const favoriteNodes = useMemo(
    () =>
      favorites
        .map((fid) => MENU_BY_ID[fid])
        .filter((node): node is NavNode => Boolean(node && hasPermission(node.permission))),
    [favorites, hasPermission]
  );

  if (!activeModule) {
    return null;
  }

  const isNodeSelected = (node: NavNode): boolean => {
    if (activeNode.id === node.id) return true;
    if (activeNode.nodeType === 'tab' && activeNode.parentId === node.id) return true;
    if (node.children?.some((c) => c.id === activeNode.id || c.id === activeNode.parentId)) {
      return true;
    }
    return false;
  };

  const renderFavoritesPopover = (positionClass: string) => {
    if (!favoritesHovered) return null;
    return (
      <div className={`absolute z-50 ${positionClass}`}>
        <div className="w-64 rounded-2xl qsl-glass-popover p-2.5 space-y-1">
          <div className="px-2.5 py-1.5 border-b border-[#171916]/[0.08] flex items-center justify-between text-[13px] font-bold text-[#171916]">
            <span>已收藏常用菜单</span>
            <span className="text-[12px] font-normal text-[#73796F] tabular-nums">
              {favoriteNodes.length} 项
            </span>
          </div>
          {favoriteNodes.length === 0 ? (
            <div className="px-2.5 py-4 text-center text-[13px] text-[#73796F]">
              暂无收藏菜单，可点击页面标题旁星标收藏
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto qsl-scroll space-y-0.5 pt-1">
              {favoriteNodes.map((node) => {
                const mod = MENU_BY_ID[node.moduleId];
                const isCurrent = activeNode.id === node.id || activeNode.parentId === node.id;
                const isDeveloped = isNodeDevelopedForUser(node, hasPermission);
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => {
                      navigateToNode(node);
                      setFavoritesHovered(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isDeveloped
                        ? isCurrent
                          ? 'bg-[var(--qsl-accent-soft)] text-[#171916]'
                          : 'text-[#171916] hover:bg-[#F8F9F5]'
                        : isCurrent
                          ? 'bg-[#E5E7E1] text-[#6E736B] opacity-80 grayscale'
                          : 'text-[#9EA39A] opacity-65 grayscale hover:opacity-85 hover:bg-[#F8F9F5]'
                    }`}
                  >
                    <span className="text-[14px] font-medium truncate">{node.label}</span>
                    {mod && (
                      <span className="text-[12px] text-[#73796F] shrink-0">{mod.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExpandedContent = () => (
    <div className="flex flex-col h-full bg-transparent">
      {/* Minimalist borderless Module Header (no "01模块" code prefix) */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            className={`text-[19px] font-bold truncate ${
              isNodeDevelopedForUser(activeModule, hasPermission)
                ? 'text-[#171916]'
                : 'text-[#8B9087]'
            }`}
          >
            {activeModule.label}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (mobileDrawerOpen) setMobileDrawerOpen(false);
              else setSidebarCollapsed(true);
            }}
            aria-label={mobileDrawerOpen ? '关闭菜单抽屉' : '收起为图标竖条'}
            title={mobileDrawerOpen ? '关闭菜单' : '收起左侧菜单'}
            className="w-8 h-8 rounded-full bg-white border border-[#D9DDD4] hover:border-[#171916] inline-flex items-center justify-center text-[#171916] transition-colors cursor-pointer shrink-0"
          >
            {mobileDrawerOpen ? <X className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-[#73796F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={moduleSearch}
            onChange={(e) => setModuleSearch(e.target.value)}
            placeholder="过滤子菜单"
            className="w-full h-9 pl-9 pr-3 rounded-full border border-[#D9DDD4] bg-white text-[14px] text-[#171916] placeholder:text-[#73796F] outline-none transition-colors hover:border-[#9DA498] focus:border-[var(--qsl-accent-border)] focus:ring-1 focus:ring-[var(--qsl-accent-border)]"
          />
        </div>
      </div>

      {/* Borderless L2 (bold) / L3 (normal) Menu Tree with Icons */}
      <nav aria-label={`${activeModule.label}子菜单`} className="flex-1 overflow-y-auto qsl-scroll px-3 py-2 space-y-1">
        {l2Items.length === 0 ? (
          <div className="px-3 py-6 text-center text-[14px] text-[#73796F]">
            无匹配子菜单
          </div>
        ) : (
          l2Items.map((l2) => {
            const isGroup = l2.nodeType === 'group' && l2.children && l2.children.length > 0;
            const visibleL3 = (l2.children ?? []).filter(
              (c) =>
                hasPermission(c.permission) &&
                (!moduleSearch.trim() ||
                  c.label.toLowerCase().includes(moduleSearch.trim().toLowerCase()) ||
                  l2.label.toLowerCase().includes(moduleSearch.trim().toLowerCase()))
            );
            const hasActiveChild = visibleL3.some((c) => isNodeSelected(c));
            const expanded = expandedGroups[l2.id] ?? (hasActiveChild || Boolean(moduleSearch.trim()));
            const l2Developed = isNodeDevelopedForUser(l2, hasPermission);

            if (!isGroup) {
              const selected = isNodeSelected(l2);
              return (
                <button
                  key={l2.id}
                  type="button"
                  onClick={() => navigateToNode(l2)}
                  title={
                    l2Developed
                      ? l2.label
                      : `${l2.label}（暂未按真实需求完成开发，置灰预览）`
                  }
                  className={`w-full text-left px-3 py-2.5 rounded-2xl text-[15px] flex items-center gap-3 transition-colors cursor-pointer ${
                    l2Developed
                      ? selected
                        ? 'font-bold bg-[var(--qsl-accent-soft)] text-[#171916]'
                        : 'font-bold text-[#171916] hover:bg-[#EAECE6]/70'
                      : selected
                        ? 'font-medium bg-[#E4E7E0] text-[#6E736B] opacity-85 grayscale'
                        : 'font-medium text-[#A8ADA4] opacity-65 grayscale hover:opacity-85 hover:text-[#73796F] hover:bg-[#EAECE6]/50'
                  }`}
                >
                  <L2MenuIcon
                    nodeId={l2.id}
                    label={l2.label}
                    className={`w-[18px] h-[18px] shrink-0 ${
                      l2Developed
                        ? 'text-[#171916]'
                        : selected
                          ? 'text-[#6E736B]'
                          : 'text-[#A8ADA4]'
                    }`}
                  />
                  <span className="truncate">{l2.label}</span>
                </button>
              );
            }

            return (
              <div key={l2.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedGroups((prev) => ({ ...prev, [l2.id]: !expanded }))
                  }
                  aria-expanded={expanded}
                  className={`w-full text-left px-3 py-2.5 rounded-2xl text-[15px] flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    l2Developed
                      ? hasActiveChild
                        ? 'font-bold text-[#171916] bg-[#EAECE6]/60'
                        : 'font-bold text-[#171916] hover:bg-[#EAECE6]/70'
                      : hasActiveChild
                        ? 'font-medium text-[#6E736B] bg-[#EAECE6]/50 opacity-80 grayscale'
                        : 'font-medium text-[#A8ADA4] opacity-65 grayscale hover:opacity-85 hover:bg-[#EAECE6]/45'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <L2MenuIcon
                      nodeId={l2.id}
                      label={l2.label}
                      className={`w-[18px] h-[18px] shrink-0 ${
                        l2Developed
                          ? 'text-[#171916]'
                          : hasActiveChild
                            ? 'text-[#6E736B]'
                            : 'text-[#A8ADA4]'
                      }`}
                    />
                    <span className="truncate">{l2.label}</span>
                  </span>
                  {expanded ? (
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 ${l2Developed ? 'text-[#5F645D]' : 'text-[#A8ADA4]'}`}
                    />
                  ) : (
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 ${l2Developed ? 'text-[#5F645D]' : 'text-[#A8ADA4]'}`}
                    />
                  )}
                </button>
                {expanded && (
                  <div className="pl-9 pr-1 space-y-0.5">
                    {visibleL3.map((l3) => {
                      const selected = isNodeSelected(l3);
                      const l3Developed = isNodeDevelopedForUser(l3, hasPermission);
                      return (
                        <button
                          key={l3.id}
                          type="button"
                          onClick={() => navigateToNode(l3)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-[14px] flex items-center gap-2 transition-colors cursor-pointer ${
                            l3Developed
                              ? selected
                                ? 'font-medium bg-[var(--qsl-accent-soft)] text-[#171916]'
                                : 'font-medium text-[#171916] hover:bg-[#EAECE6]/70'
                              : selected
                                ? 'font-normal bg-[#E4E7E0] text-[#6E736B] opacity-85 grayscale'
                                : 'font-normal text-[#A8ADA4] opacity-65 grayscale hover:opacity-85 hover:text-[#73796F] hover:bg-[#EAECE6]/50'
                          }`}
                        >
                          <span className="truncate">{l3.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Bottom Favorites Hover Popover Trigger (no 最近访问) */}
      <div className="px-4 py-4">
        <div
          className="relative"
          onMouseEnter={() => setFavoritesHovered(true)}
          onMouseLeave={() => setFavoritesHovered(false)}
        >
          {renderFavoritesPopover('bottom-full left-0 pb-2')}
          <div
            role="button"
            tabIndex={0}
            aria-label="常用菜单"
            onFocus={() => setFavoritesHovered(true)}
            onBlur={() => setFavoritesHovered(false)}
            className="w-full h-10 px-3.5 rounded-2xl bg-white border border-[#D9DDD4] hover:border-[#171916] flex items-center justify-between gap-2 text-[14px] font-bold text-[#171916] cursor-pointer transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Star className="w-4 h-4 text-[#171916] fill-[var(--qsl-accent)]" />
              <span>常用菜单</span>
            </span>
            <span className="text-[12px] font-medium text-[#73796F] tabular-nums">
              {favoriteNodes.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Collapsed Minimalist Vertical Icon Rail showing circular right-arrow expand button + L2 icons + bottom hover favorites
  const stickyShellClass = headerVisible
    ? 'lg:top-16 lg:h-[calc(100vh-4rem)]'
    : 'lg:top-0 lg:h-screen';

  const renderCollapsedIconRail = () => (
    <aside
      aria-label={`${activeModule.label}图标菜单栏`}
      className={`hidden lg:flex flex-col items-center py-5 w-[68px] bg-transparent shrink-0 gap-2 sticky transition-[top,height] duration-200 ease-out ${stickyShellClass}`}
    >
      <button
        type="button"
        onClick={() => setSidebarCollapsed(false)}
        aria-label="展开左侧菜单"
        title={`展开「${activeModule.label}」文字菜单`}
        className="w-9 h-9 rounded-full bg-white border border-[#D9DDD4] hover:border-[#171916] inline-flex items-center justify-center text-[#171916] transition-colors cursor-pointer mb-2 shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center gap-2 w-full px-2">
        {l2Items.map((l2) => {
          const selected = isNodeSelected(l2);
          const l2Developed = isNodeDevelopedForUser(l2, hasPermission);
          return (
            <button
              key={l2.id}
              type="button"
              onClick={() => navigateToNode(l2)}
              title={l2.label}
              aria-label={l2.label}
              className={`w-11 h-11 rounded-2xl inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                l2Developed
                  ? selected
                    ? 'bg-[var(--qsl-brand-dark)] text-[var(--qsl-accent-on-dark)]'
                    : 'text-[#171916] hover:bg-[#EAECE6]'
                  : selected
                    ? 'bg-[#E2E5DE] text-[#6E736B] opacity-80 grayscale'
                    : 'text-[#B2B7AE] opacity-60 grayscale hover:opacity-85 hover:bg-[#EAECE6]/60'
              }`}
            >
              <L2MenuIcon nodeId={l2.id} label={l2.label} className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Bottom hover favorites trigger in collapsed mode */}
      <div
        className="relative pt-2"
        onMouseEnter={() => setFavoritesHovered(true)}
        onMouseLeave={() => setFavoritesHovered(false)}
      >
        {renderFavoritesPopover('left-full bottom-0 pl-2')}
        <button
          type="button"
          aria-label="常用菜单"
          title="常用菜单"
          className="w-10 h-10 rounded-full bg-white border border-[#D9DDD4] hover:border-[#171916] inline-flex items-center justify-center text-[#171916] cursor-pointer transition-colors"
        >
          <Star className="w-4 h-4 text-[#171916] fill-[var(--qsl-accent)]" />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {sidebarCollapsed ? (
        renderCollapsedIconRail()
      ) : (
        <aside className={`qsl-font-side hidden lg:block w-[248px] shrink-0 sticky transition-[top,height] duration-200 ease-out ${stickyShellClass}`}>
          {renderExpandedContent()}
        </aside>
      )}

      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-[#171916]/24 backdrop-blur-[4px] flex"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <aside className="qsl-font-side w-[272px] h-full bg-white/82 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl border-r border-[#171916]/[0.08]">
            {renderExpandedContent()}
          </aside>
        </div>
      )}
    </>
  );
};
