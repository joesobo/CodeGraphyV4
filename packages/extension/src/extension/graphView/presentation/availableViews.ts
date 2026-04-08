import type { IAvailableView } from '../../../shared/view/types';
import type { IViewInfo } from '../../../core/views/contracts';

function shouldExposeView(viewId: string): boolean {
  return viewId !== 'codegraphy.depth-graph';
}

export function mapAvailableViews(
  availableViews: readonly IViewInfo[],
  activeViewId: string,
): IAvailableView[] {
  return availableViews
    .filter((info) => shouldExposeView(info.view.id))
    .map((info) => ({
      id: info.view.id,
      name: info.view.name,
      icon: info.view.icon,
      description: info.view.description,
      active: info.view.id === activeViewId,
    }));
}
