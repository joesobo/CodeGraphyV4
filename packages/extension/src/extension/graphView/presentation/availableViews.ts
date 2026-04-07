import type { IAvailableView } from '../../../shared/view/types';
import type { IViewInfo } from '../../../core/views/contracts';

export function mapAvailableViews(
  availableViews: readonly IViewInfo[],
  activeViewId: string,
): IAvailableView[] {
  return availableViews.map((info) => ({
    id: info.view.id,
    name: info.view.name,
    icon: info.view.icon,
    description: info.view.description,
    active: info.view.id === activeViewId,
  }));
}
