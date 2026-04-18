const SVG_START_ANGLE = -Math.PI / 2;

function svgPoint(x: number, y: number, radius: number, angle: number): string {
  return `${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`;
}

export function svgRegularPolygonPath(x: number, y: number, size: number, sides: number): string {
  const angleStep = (2 * Math.PI) / sides;
  const points = Array.from({ length: sides }, (_value, index) =>
    svgPoint(x, y, size, SVG_START_ANGLE + index * angleStep)
  );

  return `M${points.join('L')}Z`;
}
