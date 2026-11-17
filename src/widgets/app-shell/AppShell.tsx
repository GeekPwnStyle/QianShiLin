import React from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { useNavigation } from '@/src/modules/navigation/application/NavigationContext';
import {
  MENU_BY_ID,
  WORKBENCH_NODE,
  isNodeDevelopedForUser,
} from '@/src/modules/navigation/domain/menuRegistry';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { NoPermissionState } from '@/src/shared/ui/StateViews';
import { AllModulesPanel } from '@/src/widgets/all-modules-panel/AllModulesPanel';
import { ModuleSidebar } from '@/src/widgets/module-sidebar/ModuleSidebar';
import { TopHeader } from '@/src/widgets/top-navigation/TopHeader';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { hasPermission, currentRole } = useAuth();
  const {
    activeNode,
    breadcrumbs,
    favorites,
    toggleFavorite,
    navigateToRoute,
    navigateToNode,
  } = useNavigation();

  const isWorkbench = activeNode.id === 'workbench';
  const parentL3 =
    activeNode.nodeType === 'tab' && activeNode.parentId
      ? MENU_BY_ID[activeNode.parentId]
      : activeNode.nodeType === 'page' && activeNode.children && activeNode.children.length > 0
        ? activeNode
        : null;

  const l4Tabs = parentL3?.children?.filter((c) => c.nodeType === 'tab' && hasPermission(c.permission)) ?? [];
  const permitted = hasPermission(activeNode.permission);

  const favTargetId = parentL3 ? parentL3.id : activeNode.id;
  const isFavorited = favorites.includes(favTargetId);

  const helpContent = [
    activeNode.description,
    activeNode.unconfirmedNote && permitted
      ? `待确认业务规则：${activeNode.unconfirmedNote}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[#171916]">
      <TopHeader />
      <AllModulesPanel />

      {/* Borderless seamless split between left L2 icon/menu rail and right workspace */}
      <div className="flex-1 flex min-h-0 bg-transparent pt-16">
        <ModuleSidebar />

        <main className="flex-1 min-w-0 bg-transparent">
          <div className="w-full px-4 sm:px-6 lg:px-9 py-6 space-y-6">
            {!isWorkbench && (
              <>
                <nav
                  aria-label="面包屑导航"
                  className="flex flex-wrap items-center gap-1.5 text-[14px] text-[#73796F]"
                >
                  <button
                    type="button"
                    onClick={() => navigateToRoute('/workbench')}
                    className={`cursor-pointer ${
                      isNodeDevelopedForUser(WORKBENCH_NODE, hasPermission)
                        ? 'text-[#5F645D] hover:text-[#171916]'
                        : 'text-[#A8ADA4] hover:text-[#73796F]'
                    }`}
                  >
                    工作台
                  </button>
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const crumbDeveloped = isNodeDevelopedForUser(crumb, hasPermission);
                    return (
                      <React.Fragment key={crumb.id}>
                        <ChevronRight className="w-4 h-4 text-[#A8B0A0]" aria-hidden="true" />
                        {isLast ? (
                          <span
                            className={`font-medium ${
                              crumbDeveloped ? 'text-[#171916]' : 'text-[#8B9087]'
                            }`}
                          >
                            {crumb.label}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigateToNode(crumb)}
                            className={`cursor-pointer ${
                              crumbDeveloped
                                ? 'text-[#5F645D] hover:text-[#171916]'
                                : 'text-[#A8ADA4] hover:text-[#73796F]'
                            }`}
                          >
                            {crumb.label}
                          </button>
                        )}
                      </React.Fragment>
                    );
                  })}
                </nav>

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-[30px] sm:text-[32px] font-semibold tracking-tight text-[#171916] leading-tight">
                        {activeNode.label}
                      </h1>
                      {helpContent && (
                        <HelpTooltip
                          title={activeNode.unconfirmedNote && permitted ? '页面与待确认规则说明' : '页面功能说明'}
                          tone={activeNode.unconfirmedNote && permitted ? 'warning' : 'neutral'}
                          content={helpContent}
                          ariaLabel={`查看${activeNode.label}说明`}
                        />
                      )}
                      {(parentL3?.favoritable ?? activeNode.favoritable) && (
                        <button
                          type="button"
                          onClick={() => toggleFavorite(favTargetId)}
                          aria-label={isFavorited ? '取消收藏此菜单' : '收藏到常用菜单'}
                          title={isFavorited ? '取消收藏' : '收藏到常用菜单'}
                          className={`w-9 h-9 rounded-full inline-flex items-center justify-center border transition-colors cursor-pointer ${
                            isFavorited
                              ? 'bg-[#D7FF00] border-[#171916]/30 text-[#171916]'
                              : 'bg-white border-[#D9DDD4] text-[#73796F] hover:text-[#171916]'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {l4Tabs.length > 0 && permitted && (
                  <div
                    role="tablist"
                    aria-label="四级子页面切换"
                    className="flex flex-wrap items-center gap-2 border-b border-[#D9DDD4] pb-3"
                  >
                    {l4Tabs.map((tab) => {
                      const active = activeNode.id === tab.id;
                      const tabDeveloped = isNodeDevelopedForUser(tab, hasPermission);
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          aria-selected={active}
                          type="button"
                          onClick={() => navigateToRoute(tab.route)}
                          className={`h-10 px-5 rounded-full text-[15px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                            tabDeveloped
                              ? active
                                ? 'bg-[#171916] text-white'
                                : 'bg-white text-[#171916] border border-[#D9DDD4] hover:border-[#171916]'
                              : active
                                ? 'bg-[#D9DDD4] text-[#5F645D] grayscale'
                                : 'bg-[#F1F2EE] text-[#A8ADA4] border border-[#E2E5DE] opacity-70 grayscale hover:opacity-90'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!permitted ? (
              <NoPermissionState
                moduleLabel={activeNode.label}
                requiredPermission={activeNode.permission}
                currentRoleName={currentRole?.name}
                onBackWorkbench={() => navigateToRoute('/workbench')}
              />
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
