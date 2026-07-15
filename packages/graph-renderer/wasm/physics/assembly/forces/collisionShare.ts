@inline
function weightedFirstShare(firstRadius: f64, secondRadius: f64): f64 {
  const total = firstRadius * firstRadius + secondRadius * secondRadius;
  return total > 0 ? secondRadius * secondRadius / total : 0.5;
}

@inline
export function firstCollisionShare(
  firstRadius: f64,
  secondRadius: f64,
  firstPinned: bool,
  secondPinned: bool,
): f64 {
  if (firstPinned) return 0;
  if (secondPinned) return 1;
  return weightedFirstShare(firstRadius, secondRadius);
}

@inline
export function secondCollisionShare(
  firstRadius: f64,
  secondRadius: f64,
  firstPinned: bool,
  secondPinned: bool,
): f64 {
  if (secondPinned) return 0;
  if (firstPinned) return 1;
  return 1 - weightedFirstShare(firstRadius, secondRadius);
}
