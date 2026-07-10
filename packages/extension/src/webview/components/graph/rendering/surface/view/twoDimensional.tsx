import type { ReactElement } from 'react';
import type { Surface2dProps } from '../owned2d/contracts';
import { OwnedGraphSurface2d } from '../owned2d/view';

export type { Surface2dProps } from '../owned2d/contracts';

export function Surface2d(props: Surface2dProps): ReactElement {
  return <OwnedGraphSurface2d {...props} />;
}
