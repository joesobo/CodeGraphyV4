export let centralGravity: f64 = 0.1;
export let chargeDistanceMaximum: f64 = Infinity;
export let chargeDistanceMinimum: f64 = 1;
export let chargeStrength: f64 = -250;
export let chargeTheta: f64 = 0.9;
export let collisionPadding: f64 = 0;
export let collisionStrength: f64 = 1;
export let initializationSpacing: f64 = 10;
export let linkDistance: f64 = 80;
export let linkStrength: f64 = 1;
export let maximumCollisionNeighbors: f64 = 128;
export let velocityDecay: f64 = 0.4;
export let collisionCellSize: f64 = 2;

export function configurePhysics(
  nextCentralGravity: f64,
  nextChargeDistanceMaximum: f64,
  nextChargeDistanceMinimum: f64,
  nextChargeStrength: f64,
  nextChargeTheta: f64,
  nextCollisionPadding: f64,
  nextCollisionStrength: f64,
  nextInitializationSpacing: f64,
  nextLinkDistance: f64,
  nextLinkStrength: f64,
  nextMaximumCollisionNeighbors: f64,
  nextVelocityDecay: f64,
  nextCollisionCellSize: f64,
): void {
  centralGravity = nextCentralGravity;
  chargeDistanceMaximum = nextChargeDistanceMaximum;
  chargeDistanceMinimum = nextChargeDistanceMinimum;
  chargeStrength = nextChargeStrength;
  chargeTheta = nextChargeTheta;
  collisionPadding = nextCollisionPadding;
  collisionStrength = nextCollisionStrength;
  initializationSpacing = nextInitializationSpacing;
  linkDistance = nextLinkDistance;
  linkStrength = nextLinkStrength;
  maximumCollisionNeighbors = nextMaximumCollisionNeighbors;
  velocityDecay = nextVelocityDecay;
  collisionCellSize = nextCollisionCellSize;
}
