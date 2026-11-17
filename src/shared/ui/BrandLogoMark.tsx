import React, { useId } from 'react';

interface BrandLogoMarkProps {
  size?: number;
  className?: string;
}

export const BrandLogoMark: React.FC<BrandLogoMarkProps> = ({
  size = 32,
  className = '',
}) => {
  const gradId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id={gradId} x1="14" y1="17" x2="18" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--qsl-accent-on-dark)" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="9" fill="var(--qsl-brand-dark)" />

      {/* Left temple arm & hinge lug */}
      <path
        d="M7.2 17.5L5.6 17.1L6.9 10.8C7.2 9.5 8.2 9.1 9.2 9.6"
        stroke="var(--qsl-accent-on-dark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right temple arm & hinge lug */}
      <path
        d="M24.8 17.5L26.4 17.1L25.1 10.8C24.8 9.5 23.8 9.1 22.8 9.6"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left lens */}
      <circle
        cx="10.8"
        cy="18.6"
        r="3.75"
        fill="var(--qsl-accent-on-dark)"
        fillOpacity="0.14"
        stroke="var(--qsl-accent-on-dark)"
        strokeWidth="2.1"
      />

      {/* Right lens */}
      <circle
        cx="21.2"
        cy="18.6"
        r="3.75"
        fill="#FFFFFF"
        fillOpacity="0.09"
        stroke="#FFFFFF"
        strokeWidth="2.1"
      />

      {/* Arched nose bridge */}
      <path
        d="M14.4 17.7Q16 15.9 17.6 17.7"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Subtle optical lens glints */}
      <path
        d="M9.3 17.4A2 2 0 0 1 11 16.6"
        stroke="var(--qsl-accent-on-dark)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M19.7 17.4A2 2 0 0 1 21.4 16.6"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
};
