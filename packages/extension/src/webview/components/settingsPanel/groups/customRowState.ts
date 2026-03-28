import { cn } from '../../ui/cn';

export function getCustomRowClassName({
  dragIndex,
  dragOverIndex,
  groupDisabled,
  index,
  isExpanded,
}: {
  dragIndex: number | null;
  dragOverIndex: number | null;
  groupDisabled: boolean | undefined;
  index: number;
  isExpanded: boolean;
}): string {
  return cn(
    'rounded transition-colors',
    dragOverIndex === index
      && dragIndex !== index
      && 'bg-accent outline outline-1 outline-primary/50',
    dragIndex === index && 'opacity-40',
    isExpanded && 'bg-accent/50 p-1.5',
    groupDisabled && 'opacity-50',
  );
}

export function isCustomRowDraggable(isExpanded: boolean): boolean {
  return !isExpanded;
}
