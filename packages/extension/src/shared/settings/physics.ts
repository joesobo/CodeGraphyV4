export interface IPhysicsSettings {
  repelForce: number;
  linkDistance: number;
  linkForce: number;
  damping: number;
  centerForce: number;
  chargeRange?: number;
}

export const DEFAULT_PHYSICS_SETTINGS: IPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 0.15,
  damping: 0.7,
  centerForce: 0.1,
};
