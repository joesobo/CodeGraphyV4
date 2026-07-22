@inline
export function quadrantAt(
  nodeX: f64,
  nodeY: f64,
  midpointX: f64,
  midpointY: f64,
): i32 {
  return (nodeY >= midpointY ? 2 : 0) + (nodeX >= midpointX ? 1 : 0);
}
