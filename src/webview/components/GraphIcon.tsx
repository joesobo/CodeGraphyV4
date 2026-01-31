import React from 'react';

interface GraphIconProps {
  className?: string;
}

export default function GraphIcon({ className = 'w-10 h-10' }: GraphIconProps): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Central node */}
      <circle cx="12" cy="12" r="3" className="fill-accent" />

      {/* Outer nodes */}
      <circle cx="4" cy="6" r="2" className="fill-secondary" />
      <circle cx="20" cy="6" r="2" className="fill-secondary" />
      <circle cx="4" cy="18" r="2" className="fill-secondary" />
      <circle cx="20" cy="18" r="2" className="fill-secondary" />
      <circle cx="12" cy="3" r="1.5" className="fill-muted" />
      <circle cx="12" cy="21" r="1.5" className="fill-muted" />

      {/* Connections */}
      <line x1="9.5" y1="10" x2="5.5" y2="7.5" className="stroke-muted" />
      <line x1="14.5" y1="10" x2="18.5" y2="7.5" className="stroke-muted" />
      <line x1="9.5" y1="14" x2="5.5" y2="16.5" className="stroke-muted" />
      <line x1="14.5" y1="14" x2="18.5" y2="16.5" className="stroke-muted" />
      <line x1="12" y1="9" x2="12" y2="4.5" className="stroke-muted" />
      <line x1="12" y1="15" x2="12" y2="19.5" className="stroke-muted" />
    </svg>
  );
}
