import React from 'react';
import type { IconProps } from './iconProps';

/** Tree pointing down — top-down mode */
export const DagTopDownIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
    <circle cx="12" cy="4" r="2.5" fill="currentColor" />
    <circle cx="6" cy="13" r="2.5" fill="currentColor" />
    <circle cx="18" cy="13" r="2.5" fill="currentColor" />
    <circle cx="3" cy="21" r="2" fill="currentColor" />
    <circle cx="9" cy="21" r="2" fill="currentColor" />
    <circle cx="18" cy="21" r="2" fill="currentColor" />
    <line x1="10.5" y1="5.8" x2="7.5" y2="11" stroke="currentColor" strokeWidth="1.2" />
    <line x1="13.5" y1="5.8" x2="16.5" y2="11" stroke="currentColor" strokeWidth="1.2" />
    <line x1="4.8" y1="15" x2="3.5" y2="19" stroke="currentColor" strokeWidth="1.2" />
    <line x1="7.2" y1="15" x2="8.5" y2="19" stroke="currentColor" strokeWidth="1.2" />
    <line x1="18" y1="15.5" x2="18" y2="19" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
