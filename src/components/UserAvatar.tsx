import { useState } from 'react';

export const UserAvatar = ({
  name,
  avatar,
  size = 'sm',
}: {
  name?: string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md';
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass =
    size === 'xs'
      ? 'w-5 h-5 text-[9px]'
      : size === 'sm'
        ? 'w-7 h-7 text-[11px]'
        : 'w-9 h-9 text-xs';

  const initials = (name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  if (avatar && !imgFailed) {
    return (
      <img
        src={avatar}
        alt={name || 'Usuario'}
        className={`${sizeClass} rounded-full border border-slate-200 object-cover shrink-0`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0`}
    >
      {initials || 'U'}
    </div>
  );
};