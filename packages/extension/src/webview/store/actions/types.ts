import type { StoreApi } from 'zustand/vanilla';
import type { GraphState } from '../state';

export type SetState = StoreApi<GraphState>['setState'];
export type GetState = StoreApi<GraphState>['getState'];
