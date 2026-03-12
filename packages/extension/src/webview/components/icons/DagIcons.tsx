import React from 'react';

interface DagIconProps {
  size?: number;
  className?: string;
}

/** Scattered nodes — free-form physics layout (default) */
export const DagDefaultIcon: React.FC<DagIconProps> = ({ size = 18, className }) => (
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

/** Center node with radial children — radialout mode */
export const DagRadialIcon: React.FC<DagIconProps> = ({ size = 18, className }) => (
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

/** Tree pointing down — top-down mode */
export const DagTopDownIcon: React.FC<DagIconProps> = ({ size = 18, className }) => (
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

/** Tree pointing right — left-to-right mode */
export const DagLeftRightIcon: React.FC<DagIconProps> = ({ size = 18, className }) => (
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
