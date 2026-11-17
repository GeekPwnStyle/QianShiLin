import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  variant?: 'default' | 'white' | 'pill' | 'compact';
  prefixIcon?: React.ReactNode;
  ariaLabel?: string;
  id?: string;
  className?: string;
  buttonClassName?: string;
  popoverClassName?: string;
  menuMinWidth?: number;
  align?: 'left' | 'right' | 'auto';
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
}

const VARIANT_CLASSES: Record<NonNullable<SelectProps['variant']>, string> = {
  default:
    'w-full h-10 px-3 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[15px] text-[#171916] hover:border-[#B8BEB2]',
  white:
    'w-full h-10 px-3 rounded-[9px] bg-white border border-[#D9DDD4] text-[15px] text-[#171916] hover:border-[#B8BEB2]',
  pill:
    'h-9 px-3 rounded-full bg-[#F8F9F5] border border-[#D9DDD4] text-[13px] font-medium text-[#171916] hover:border-[#B8BEB2] hover:bg-white',
  compact:
    'h-9 px-2.5 rounded-[9px] bg-[#F8F9F5] border border-[#D9DDD4] text-[14px] text-[#171916] hover:border-[#B8BEB2]',
};

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择',
  disabled = false,
  variant = 'default',
  prefixIcon,
  ariaLabel,
  id,
  className = '',
  buttonClassName = '',
  popoverClassName = '',
  menuMinWidth,
  align = 'auto',
}) => {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [menuPos, setMenuPos] = useState<MenuPosition>({
    top: 0,
    left: 0,
    width: 180,
    maxHeight: 264,
    placement: 'bottom',
  });

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const selectedIndex = useMemo(
    () => options.findIndex((opt) => opt.value === value && !opt.disabled),
    [options, value]
  );

  const findNextEnabledIndex = useCallback(
    (startIndex: number, step: 1 | -1) => {
      if (options.length === 0) return -1;
      let idx = startIndex;
      for (let i = 0; i < options.length; i += 1) {
        idx = (idx + step + options.length) % options.length;
        if (!options[idx]?.disabled) return idx;
      }
      return -1;
    },
    [options]
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 12;
    const minW = menuMinWidth ?? (variant === 'pill' ? 196 : rect.width);
    const width = Math.min(Math.max(rect.width, minW), window.innerWidth - viewportPadding * 2);

    const estimatedMenuHeight = Math.min(280, options.length * 40 + 14);
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const spaceAbove = rect.top - gap - viewportPadding;

    const placeAbove = spaceBelow < Math.min(estimatedMenuHeight, 180) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(288, placeAbove ? spaceAbove : spaceBelow));
    const actualHeight = Math.min(estimatedMenuHeight, maxHeight);

    const top = placeAbove
      ? Math.max(viewportPadding, rect.top - gap - actualHeight)
      : Math.min(window.innerHeight - viewportPadding - actualHeight, rect.bottom + gap);

    let left: number;
    if (align === 'right' || (align === 'auto' && rect.left + width > window.innerWidth - viewportPadding)) {
      left = Math.max(viewportPadding, rect.right - width);
    } else {
      left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
    }

    setMenuPos({
      top,
      left,
      width,
      maxHeight,
      placement: placeAbove ? 'top' : 'bottom',
    });
  }, [align, menuMinWidth, options.length, variant]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const initialIndex = selectedIndex >= 0 ? selectedIndex : findNextEnabledIndex(-1, 1);
    setHighlightedIndex(initialIndex);

    const raf = window.requestAnimationFrame(() => {
      if (initialIndex >= 0) {
        optionRefs.current[initialIndex]?.scrollIntoView({ block: 'nearest' });
      }
    });

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleResize = () => {
      updatePosition();
    };

    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDownCapture, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [findNextEnabledIndex, open, selectedIndex, updatePosition]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const commitValue = (nextVal: string) => {
    if (nextVal !== value) {
      onChange(nextVal);
    }
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setHighlightedIndex((prev) => findNextEnabledIndex(prev < 0 ? -1 : prev, 1));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setHighlightedIndex((prev) => findNextEnabledIndex(prev < 0 ? 0 : prev, -1));
      }
      return;
    }

    if (e.key === 'Home' && open) {
      e.preventDefault();
      setHighlightedIndex(findNextEnabledIndex(-1, 1));
      return;
    }

    if (e.key === 'End' && open) {
      e.preventDefault();
      setHighlightedIndex(findNextEnabledIndex(0, -1));
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (highlightedIndex >= 0 && options[highlightedIndex] && !options[highlightedIndex].disabled) {
        commitValue(options[highlightedIndex].value);
      } else {
        setOpen(false);
      }
      return;
    }

    if (e.key === 'Tab' && open) {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${variant === 'pill' || variant === 'compact' ? 'inline-block' : 'w-full'} ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`inline-flex items-center justify-between gap-2 text-left transition-all outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${
          open ? 'border-[#171916] ring-2 ring-[#171916]/[0.08] bg-white' : ''
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          {prefixIcon && <span className="shrink-0 flex items-center">{prefixIcon}</span>}
          <span className={`truncate ${selectedOption ? 'text-[#171916]' : 'text-[#73796F]'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#5F645D] shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-[#171916]' : ''
          }`}
        />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              maxHeight: `${menuPos.maxHeight}px`,
            }}
            className={`z-[90] qsl-glass-popover rounded-[14px] p-1.5 overflow-y-auto qsl-scroll ${
              menuPos.placement === 'top' ? 'origin-bottom' : 'origin-top'
            } ${popoverClassName}`}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2.5 text-[14px] text-[#73796F] text-center">暂无可选项</div>
            ) : (
              <div className="space-y-0.5">
                {options.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={opt.value}
                      ref={(el) => {
                        optionRefs.current[idx] = el;
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onMouseEnter={() => {
                        if (!opt.disabled) setHighlightedIndex(idx);
                      }}
                      onClick={() => {
                        if (!opt.disabled) commitValue(opt.value);
                      }}
                      className={`w-full px-3 py-2 rounded-[10px] text-left flex items-center justify-between gap-2.5 text-[14px] transition-colors cursor-pointer select-none disabled:opacity-45 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-[var(--qsl-accent-soft-85)] text-[#171916] font-semibold'
                          : isHighlighted
                          ? 'bg-[#171916]/[0.06] text-[#171916]'
                          : 'text-[#171916] hover:bg-[#171916]/[0.05]'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="block text-[12px] font-normal text-[#73796F] truncate mt-0.5">
                            {opt.description}
                          </span>
                        )}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#171916] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
