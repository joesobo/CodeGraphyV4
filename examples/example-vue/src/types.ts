import type { DisplayEntity } from './inheritance';

export interface CounterPanelProps {
  title: string;
  count: number;
}

export interface UserProfile extends DisplayEntity {
  role: string;
}
