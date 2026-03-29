import React from 'react';
import type { IconProps } from './iconProps';

/** Center node with radial children — radialout mode */
export const DagRadialIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className}>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <circle cx="12" cy="3.5" r="2" fill="currentColor" />
    <circle cx="19.5" cy="8" r="2" fill="currentColor" />
    <circle cx="19.5" cy="16" r="2" fill="currentColor" />
    <circle cx="12" cy="20.5" r="2" fill="currentColor" />
    <circle cx="4.5" cy="16" r="2" fill="currentColor" />
    <circle cx="4.5" cy="8" r="2" fill="currentColor" />
    <line x1="12" y1="9" x2="12" y2="5.5" stroke="currentColor" strokeWidth="1" />
    <line x1="14.6" y1="10.5" x2="17.7" y2="9" stroke="currentColor" strokeWidth="1" />
    <line x1="14.6" y1="13.5" x2="17.7" y2="15" stroke="currentColor" strokeWidth="1" />
    <line x1="12" y1="15" x2="12" y2="18.5" stroke="currentColor" strokeWidth="1" />
    <line x1="9.4" y1="13.5" x2="6.3" y2="15" stroke="currentColor" strokeWidth="1" />
    <line x1="9.4" y1="10.5" x2="6.3" y2="9" stroke="currentColor" strokeWidth="1" />
  </svg>
);
