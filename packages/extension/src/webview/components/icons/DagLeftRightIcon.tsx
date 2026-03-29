import React from 'react';
import type { IconProps } from './iconProps';

/** Tree pointing right — left-to-right mode */
export const DagLeftRightIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
    <circle cx="4" cy="12" r="2.5" fill="currentColor" />
    <circle cx="13" cy="6" r="2.5" fill="currentColor" />
    <circle cx="13" cy="18" r="2.5" fill="currentColor" />
    <circle cx="21" cy="3" r="2" fill="currentColor" />
    <circle cx="21" cy="9" r="2" fill="currentColor" />
    <circle cx="21" cy="18" r="2" fill="currentColor" />
    <line x1="5.8" y1="10.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="5.8" y1="13.5" x2="11" y2="16.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="15" y1="4.8" x2="19" y2="3.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="15" y1="7.2" x2="19" y2="8.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="15.5" y1="18" x2="19" y2="18" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
