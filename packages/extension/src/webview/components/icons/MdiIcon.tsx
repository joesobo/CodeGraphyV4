import React from 'react';

interface MdiIconProps {
  path: string;
  size?: number;
  className?: string;
  title?: string;
}

export const MdiIcon: React.FC<MdiIconProps> = ({ path, size = 18, className, title }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    role={title ? 'img' : undefined}
    aria-label={title}
  >
    {title && <title>{title}</title>}
    <path fill="currentColor" d={path} />
  </svg>
);
