import React from 'react';
import type { IconProps } from './types';

export const MinusIcon: React.FC<IconProps> = ({ size = 12, className }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);
