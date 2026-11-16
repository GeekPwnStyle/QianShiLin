import React from 'react';
import {
  AVATAR_PRESET_STYLES,
  type AuthSession,
} from '@/src/modules/auth/domain/identity';

interface UserAvatarProps {
  session: Pick<AuthSession, 'displayName' | 'avatarInitials' | 'avatarUrl' | 'avatarColorPreset'>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'w-7 h-7 text-[12px]',
  md: 'w-9 h-9 text-[14px]',
  lg: 'w-12 h-12 text-[17px]',
  xl: 'w-16 h-16 text-[22px]',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  session,
  size = 'sm',
  className = '',
}) => {
  const preset = AVATAR_PRESET_STYLES[session.avatarColorPreset ?? 'charcoal'];
  const sizeClass = SIZE_CLASSES[size];

  if (session.avatarUrl) {
    return (
      <img
        src={session.avatarUrl}
        alt={`${session.displayName}头像`}
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-[#171916]/15 ${className}`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} rounded-full ${preset.bgClass} ${preset.textClass} font-semibold inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {session.avatarInitials}
    </span>
  );
};
