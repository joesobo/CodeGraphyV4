import React from 'react';
import type { IconProps } from './types';

export const CloseIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
