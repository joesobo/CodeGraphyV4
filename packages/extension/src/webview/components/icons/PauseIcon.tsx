import React from 'react';
import type { IconProps } from './types';

export const PauseIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="3" width="6" height="18" />
    <rect x="14" y="3" width="6" height="18" />
  </svg>
);
