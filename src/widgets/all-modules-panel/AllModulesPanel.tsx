import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  resolveVisibleTopModuleIds,
  useNavigation,
} from '@/src/modules/navigation/application/NavigationContext';
import { MENU_TREE, isNodeDevelopedForUser } from '@/src/modules/navigation/domain/menuRegistry';
import { HelpTooltip } from '@/src/shared/ui/HelpTooltip';
import { ModuleIcon } from '@/src/widgets/top-navigation/ModuleIcon';

export const AllModulesPanel: React.FC = () => {
  const { hasPermission, currentRole, session } = useAuth();
  const {
    allModulesOpen,
    setAllModulesOpen,
    activeModule,
    navigateToModule,
    pinnedModuleIds,
    draggingModuleId,
    setDraggingModuleId,
    resetPinnedModules,
  } = useNavigation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const visibleModules = useMemo(
    () => MENU_TREE.filter((m) => hasPermission(m.permission)),
    [hasPermission]
  );

  const visibleModuleIds = useMemo(
    () => visibleModules.map((m) => m.id),
    [visibleModules]
  );

  const currentTopIds = useMemo(
    () => resolveVisibleTopModuleIds(pinnedModuleIds, visibleModuleIds),
    [pinnedModuleIds, visibleModuleIds]
  );

  useEffect(() => {
    if (!allModulesOpen) {
      setSelectedCardId(null);
      return;
    }
    const t = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(t);
  }, [allModulesOpen]);

  if (!allModulesOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-[#171916]/14 backdrop-blur-[5px] flex items-start justify-center pt-[72px] px-4 pb-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-modules-heading"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setAllModulesOpen(false);
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-6xl qsl-glass-panel rounded-[24px] p-6 md:p-7 outline-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#171916]/[0.08]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="all-modules-heading" className="text-[20px] font-semibold text-[#171916]">
              全部菜单
            </h2>
            <span className="text-[15px] text-[#5F645D] tabular-nums">
              已授权 {visibleModules.length} 个业务模块
            </span>
            <span className="text-[13px] px-2.5 py-0.5 rounded-full bg-white/70 border border-[#171916]/10 text-[#171916] font-medium">
              {currentRole?.name ?? session.roleName}
            </span>
            <HelpTooltip
              title="顶部菜单自定义说明"
              content={
                '此处仅展示当前角色已获授权的可操作业务模块；正常色彩显示的模块包含按真实需求完成开发的页面，置灰模块为原型占位预览。\n\n按住任意模块卡片，向上拖拽到顶部菜单栏的对应位置即可替换原有菜单项；顶部各模块之间也可直接互相拖动调整顺序。「工作台」为固定入口，不可移动或替换。'
              }
              ariaLabel="查看顶部菜单自定义说明"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetPinnedModules}
              className="h-9 px-3.5 rounded-full border border-[#D9DDD4] bg-white/80 hover:border-[#171916] text-[13px] font-medium text-[#171916] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>恢复默认顺序</span>
            </button>
            <button
              type="button"
              onClick={() => setAllModulesOpen(false)}
              aria-label="关闭全部菜单面板"
              className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#5F645D] hover:text-[#171916] hover:bg-white/70 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {visibleModules.length === 0 ? (
          <div className="mt-5 py-12 text-center text-[15px] text-[#5F645D]">
            当前角色暂未分配可访问的一级业务模块，请联系管理员在「系统管理 / 角色权限管理」中进行配置。
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleModules.map((mod) => {
              const isActive = activeModule?.id === mod.id;
              const isPinnedTop = currentTopIds.includes(mod.id);
              const isSelected = selectedCardId === mod.id || draggingModuleId === mod.id;
              const isDeveloped = isNodeDevelopedForUser(mod, hasPermission);

              return (
                <div
                  key={mod.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => {
                    setSelectedCardId(mod.id);
                    setDraggingModuleId(mod.id);
                    e.dataTransfer.setData(
                      'application/x-qsl-nav',
                      JSON.stringify({ source: 'all-modules', moduleId: mod.id })
                    );
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggingModuleId(null);
                    setSelectedCardId(null);
                  }}
                  onClick={() => {
                    navigateToModule(mod.id);
                    setAllModulesOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigateToModule(mod.id);
                      setAllModulesOpen(false);
                    }
                  }}
                  title={
                    isDeveloped
                      ? '包含已完成真实需求开发的页面，点击进入或拖拽到顶部菜单栏替换'
                      : '暂未按真实需求完成开发（置灰预览），点击可浏览原型或拖拽到顶部菜单栏'
                  }
                  className={`group text-left px-3.5 py-2.5 h-[54px] rounded-2xl border transition-colors flex items-center justify-between gap-2.5 select-none focus-visible:outline-2 focus-visible:outline-[#171916] cursor-grab active:cursor-grabbing ${
                    isDeveloped
                      ? isSelected
                        ? 'bg-[#ECF9A8]/85 border-[#171916] ring-2 ring-[#D7FF00]'
                        : isActive
                          ? 'bg-[#ECF9A8]/80 border-[#171916]'
                          : 'bg-white/80 border-[#171916]/15 hover:bg-white hover:border-[#171916]/55'
                      : isSelected
                        ? 'bg-[#E2E5DE] border-[#9EA49A] opacity-85 grayscale'
                        : isActive
                          ? 'bg-[#E5E7E1] border-[#AEB4AA] opacity-85 grayscale'
                          : 'bg-[#ECEEE9]/60 border-[#E0E3DC] opacity-65 grayscale hover:opacity-85 hover:border-[#C5CAC0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 ${
                        isDeveloped
                          ? isActive || isSelected
                            ? 'bg-[#171916] text-[#D7FF00]'
                            : 'bg-white border border-[#E5E8E0] text-[#171916]'
                          : isActive || isSelected
                            ? 'bg-[#9EA49A] text-white'
                            : 'bg-[#E5E7E1] border border-[#D8DCD3] text-[#9EA39A]'
                      }`}
                    >
                      <ModuleIcon name={mod.icon} className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-[15px] whitespace-nowrap truncate leading-none ${
                        isDeveloped
                          ? 'font-bold text-[#171916]'
                          : 'font-medium text-[#9EA39A]'
                      }`}
                    >
                      {mod.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPinnedTop && (
                      <span
                        className={`text-[12px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
                          isDeveloped
                            ? 'bg-[#171916]/8 text-[#171916]'
                            : 'bg-[#171916]/[0.05] text-[#9EA39A]'
                        }`}
                      >
                        顶部
                      </span>
                    )}
                    <GripVertical
                      className={`w-4 h-4 shrink-0 ${
                        isDeveloped
                          ? 'text-[#A8B0A0] group-hover:text-[#5F645D]'
                          : 'text-[#C4C8BF]'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
