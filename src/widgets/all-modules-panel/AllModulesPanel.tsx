import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import {
  resolveVisibleTopModuleIds,
  useNavigation,
} from '@/src/modules/navigation/application/NavigationContext';
import { MENU_TREE } from '@/src/modules/navigation/domain/menuRegistry';
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
                '此处仅展示当前角色已获授权的可操作业务模块。\n\n按住任意模块卡片，向上拖拽到顶部菜单栏的对应位置即可替换原有菜单项；顶部各模块之间也可直接互相拖动调整顺序。「工作台」为固定入口，不可移动或替换。'
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
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {visibleModules.map((mod) => {
              const isActive = activeModule?.id === mod.id;
              const isPinnedTop = currentTopIds.includes(mod.id);
              const isSelected = selectedCardId === mod.id || draggingModuleId === mod.id;

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
                  title="点击进入模块，或拖拽到顶部菜单栏替换"
                  className={`group text-left p-3.5 rounded-2xl border transition-colors flex flex-col justify-between min-h-[96px] select-none focus-visible:outline-2 focus-visible:outline-[#171916] cursor-grab active:cursor-grabbing ${
                    isSelected
                      ? 'bg-[#ECF9A8]/85 border-[#171916] ring-2 ring-[#D7FF00]'
                      : isActive
                        ? 'bg-[#ECF9A8]/80 border-[#171916]'
                        : 'bg-white/55 border-[#171916]/[0.08] hover:bg-white/85 hover:border-[#171916]/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`w-8 h-8 rounded-xl inline-flex items-center justify-center ${
                        isActive || isSelected
                          ? 'bg-[#171916] text-[#D7FF00]'
                          : 'bg-white border border-[#E5E8E0] text-[#171916]'
                      }`}
                    >
                      <ModuleIcon name={mod.icon} className="w-4 h-4" />
                    </span>
                    <div className="flex items-center gap-1">
                      {isPinnedTop && (
                        <span className="text-[12px] px-1.5 py-0.5 rounded bg-[#171916]/8 text-[#171916] font-medium">
                          顶部
                        </span>
                      )}
                      <GripVertical
                        className="w-4 h-4 text-[#A8B0A0] group-hover:text-[#5F645D]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-1">
                    <span className="text-[16px] font-bold text-[#171916] leading-snug">
                      {mod.label}
                    </span>
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
