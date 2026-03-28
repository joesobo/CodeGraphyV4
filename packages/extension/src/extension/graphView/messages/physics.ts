import type { IPhysicsSettings, WebviewToExtensionMessage } from '../../../shared/contracts';

export interface GraphViewPhysicsMessageHandlers {
  sendPhysicsSettings(): void;
  updatePhysicsSetting(key: keyof IPhysicsSettings, value: number): Promise<void>;
  resetPhysicsSettings(): Promise<void>;
}

export async function applyPhysicsMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewPhysicsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'GET_PHYSICS_SETTINGS':
      handlers.sendPhysicsSettings();
      return true;

    case 'UPDATE_PHYSICS_SETTING':
      await handlers.updatePhysicsSetting(message.payload.key, message.payload.value);
      return true;

    case 'RESET_PHYSICS_SETTINGS':
      await handlers.resetPhysicsSettings();
      return true;

    default:
      return false;
  }
}
