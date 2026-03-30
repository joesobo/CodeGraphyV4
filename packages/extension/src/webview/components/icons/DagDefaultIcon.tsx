import React from 'react';
import type { IconProps } from './iconProps';

/** Scattered nodes — free-form physics layout (default) */
export const DagDefaultIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
    <circle cx="6" cy="6" r="2.5" fill="currentColor" />
    <circle cx="18" cy="8" r="2.5" fill="currentColor" />
    <circle cx="10" cy="17" r="2.5" fill="currentColor" />
    <circle cx="19" cy="18" r="2.5" fill="currentColor" />
    <line x1="8.2" y1="7" x2="15.8" y2="7.7" stroke="currentColor" strokeWidth="1.2" />
    <line x1="7.5" y1="8" x2="8.8" y2="15" stroke="currentColor" strokeWidth="1.2" />
    <line x1="12.2" y1="17.2" x2="16.8" y2="17.8" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
