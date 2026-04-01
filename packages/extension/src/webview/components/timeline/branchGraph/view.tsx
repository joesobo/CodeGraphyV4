import React from 'react';
import type { BranchGraphConnection, BranchGraphRow } from './model';

const BRANCH_COLORS = [
  '#58a6ff',
  '#f78166',
  '#7ee787',
  '#d2a8ff',
  '#ffb86b',
  '#a5d6ff',
];
const CENTER_Y = 22;
const LANE_GAP = 14;
const ROW_HEIGHT = 44;
const SIDE_PADDING = 8;

export interface BranchGraphRowViewProps {
  isCurrent: boolean;
  maxLaneCount: number;
  row: BranchGraphRow;
}

export function getBranchGraphWidth(maxLaneCount: number): number {
  return Math.max(1, maxLaneCount) * LANE_GAP + SIDE_PADDING * 2;
}

export function BranchGraphRowView({
  isCurrent,
  maxLaneCount,
  row,
}: BranchGraphRowViewProps): React.ReactElement {
  const width = getBranchGraphWidth(maxLaneCount);
  const topConnectedLanes = new Set(row.topConnections.map(({ fromLane }) => fromLane));
  const bottomConnectedLanes = new Set(row.bottomConnections.map(({ toLane }) => toLane));

  return (
    <svg
      aria-hidden="true"
      className="block"
      data-testid="timeline-commit-branch-graph"
      height={ROW_HEIGHT}
      viewBox={`0 0 ${width} ${ROW_HEIGHT}`}
      width={width}
    >
      {row.topLanes
        .filter(({ lane }) => !topConnectedLanes.has(lane))
        .map(({ lane }) => (
          <line
            key={`top-${row.sha}-${lane}`}
            data-testid="timeline-commit-branch-segment"
            stroke={getLaneColor(lane)}
            strokeLinecap="round"
            strokeWidth="2"
            x1={getLaneX(lane)}
            x2={getLaneX(lane)}
            y1="0"
            y2={CENTER_Y}
          />
        ))}

      {row.topConnections.map((connection) => (
        <polyline
          key={`top-connection-${row.sha}-${connection.fromLane}-${connection.toLane}`}
          data-testid="timeline-commit-branch-segment"
          fill="none"
          points={buildTopPoints(connection)}
          stroke={getLaneColor(connection.fromLane)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      ))}

      {row.bottomLanes
        .filter(({ lane }) => !bottomConnectedLanes.has(lane))
        .map(({ lane }) => (
          <line
            key={`bottom-${row.sha}-${lane}`}
            data-testid="timeline-commit-branch-segment"
            stroke={getLaneColor(lane)}
            strokeLinecap="round"
            strokeWidth="2"
            x1={getLaneX(lane)}
            x2={getLaneX(lane)}
            y1={CENTER_Y}
            y2={ROW_HEIGHT}
          />
        ))}

      {row.bottomConnections.map((connection) => (
        <polyline
          key={`bottom-connection-${row.sha}-${connection.fromLane}-${connection.toLane}`}
          data-testid="timeline-commit-branch-segment"
          fill="none"
          points={buildBottomPoints(connection)}
          stroke={getLaneColor(connection.toLane)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      ))}

      <circle
        cx={getLaneX(row.lane)}
        cy={CENTER_Y}
        data-testid="timeline-commit-branch-dot"
        fill={isCurrent ? 'var(--vscode-focusBorder,#007fd4)' : 'var(--vscode-editor-background,#1e1e1e)'}
        r={4}
        stroke={getLaneColor(row.lane)}
        strokeWidth={isCurrent ? 2.5 : 2}
      />
    </svg>
  );
}

function buildTopPoints(connection: BranchGraphConnection): string {
  return [
    `${getLaneX(connection.fromLane)},0`,
    `${getLaneX(connection.fromLane)},${CENTER_Y}`,
    `${getLaneX(connection.toLane)},${CENTER_Y}`,
  ].join(' ');
}

function buildBottomPoints(connection: BranchGraphConnection): string {
  return [
    `${getLaneX(connection.fromLane)},${CENTER_Y}`,
    `${getLaneX(connection.toLane)},${CENTER_Y}`,
    `${getLaneX(connection.toLane)},${ROW_HEIGHT}`,
  ].join(' ');
}

function getLaneColor(lane: number): string {
  return BRANCH_COLORS[lane % BRANCH_COLORS.length] ?? BRANCH_COLORS[0];
}

function getLaneX(lane: number): number {
  return SIDE_PADDING + lane * LANE_GAP + LANE_GAP / 2;
}
