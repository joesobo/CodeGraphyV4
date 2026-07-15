export function rectangleBoundary(
  halfWidth: number,
  halfHeight: number,
  cornerRadius: number,
  directionX: number,
  directionY: number,
): number {
  const absoluteX = Math.abs(directionX);
  const absoluteY = Math.abs(directionY);
  const radius = Math.min(Math.max(0, cornerRadius), halfWidth, halfHeight);
  const vertical = absoluteX === 0 ? Number.POSITIVE_INFINITY : halfWidth / absoluteX;
  if (vertical * absoluteY <= halfHeight - radius) return vertical;
  const horizontal = absoluteY === 0 ? Number.POSITIVE_INFINITY : halfHeight / absoluteY;
  if (horizontal * absoluteX <= halfWidth - radius) return horizontal;
  const cornerX = halfWidth - radius;
  const cornerY = halfHeight - radius;
  const projection = absoluteX * cornerX + absoluteY * cornerY;
  const discriminant = projection * projection
    - cornerX * cornerX
    - cornerY * cornerY
    + radius * radius;
  return projection + Math.sqrt(Math.max(0, discriminant));
}
