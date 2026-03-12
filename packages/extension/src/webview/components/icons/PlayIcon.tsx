import React from 'react';
import type { IconProps } from './types';

export const PlayIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg className={className} width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);
