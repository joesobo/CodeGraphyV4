export interface IPhysicsSettings {
  repelForce: number;
  linkDistance: number;
  linkForce: number;
  damping: number;
  centerForce: number;
}

export const DEFAULT_PHYSICS_SETTINGS: IPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 1,
  damping: 0.4,
  centerForce: 0.1,
};
