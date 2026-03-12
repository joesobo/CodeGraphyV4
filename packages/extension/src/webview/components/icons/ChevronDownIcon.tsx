import React from 'react';
import type { IconProps } from './types';

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg className={className} width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
