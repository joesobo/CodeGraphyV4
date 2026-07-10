import {
  createInventoryWaiter as createInventoryWaiterImplementation,
  type InventoryWaiter,
} from './waiters/inventory';
import { withTimeout as withTimeoutImplementation } from './waiters/timeout';
import {
  createToggleWaiter as createToggleWaiterImplementation,
  type ToggleWaiter,
} from './waiters/toggle/waiter';

export type { InventoryWaiter, ToggleWaiter };

export const createInventoryWaiter = createInventoryWaiterImplementation;
export const createToggleWaiter = createToggleWaiterImplementation;
export const withTimeout = withTimeoutImplementation;
