import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#171916] text-white hover:bg-[#2C302A] border border-[#171916] disabled:bg-[#9CA198] disabled:border-[#9CA198]',
  accent:
    'bg-[#D7FF00] text-[#171916] hover:bg-[#CCF200] border border-[#C3E800] font-medium disabled:opacity-50',
  secondary:
    'bg-white text-[#171916] hover:bg-[#F8F9F5] border border-[#D9DDD4] disabled:text-[#9CA198]',
  ghost:
    'bg-transparent text-[#5F645D] hover:text-[#171916] hover:bg-[#EAECE6] border border-transparent disabled:opacity-40',
  danger:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-[#DC2626] disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[14px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-[15px] rounded-[10px] gap-2',
  lg: 'h-11 px-5 text-[16px] rounded-[10px] gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    children,
    className = '',
    disabled,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171916] cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});
