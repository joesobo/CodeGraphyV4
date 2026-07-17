import type { OwnedGraphCamera } from '../camera/runtime/model';
import type { MinimapPoint } from './projection';

const KEYBOARD_PAN_FRACTION = 0.1;
const ACCELERATED_PAN_MULTIPLIER = 5;

export function keyboardMinimapCameraCenter(
  key: string,
  camera: OwnedGraphCamera,
  viewportWidth: number,
  viewportHeight: number,
  accelerated: boolean,
): MinimapPoint | undefined {
  const multiplier = accelerated ? ACCELERATED_PAN_MULTIPLIER : 1;
  const horizontalStep = viewportWidth / camera.zoom * KEYBOARD_PAN_FRACTION * multiplier;
  const verticalStep = viewportHeight / camera.zoom * KEYBOARD_PAN_FRACTION * multiplier;
  switch (key) {
    case 'ArrowLeft': return { x: camera.centerX - horizontalStep, y: camera.centerY };
    case 'ArrowRight': return { x: camera.centerX + horizontalStep, y: camera.centerY };
    case 'ArrowUp': return { x: camera.centerX, y: camera.centerY - verticalStep };
    case 'ArrowDown': return { x: camera.centerX, y: camera.centerY + verticalStep };
    default: return undefined;
  }
}
