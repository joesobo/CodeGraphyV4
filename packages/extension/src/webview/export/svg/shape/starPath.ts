const SVG_START_ANGLE = -Math.PI / 2;
const SVG_STAR_INNER_RADIUS_SCALE = 0.4;
const SVG_STAR_POINT_COUNT = 10;
const SVG_STAR_ANGLE_STEP = Math.PI / 5;

function svgPoint(x: number, y: number, radius: number, angle: number): string {
  return `${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`;
}

export function svgStarPath(x: number, y: number, size: number): string {
  const points = Array.from({ length: SVG_STAR_POINT_COUNT }, (_value, index) => {
    const radius = index % 2 === 0 ? size : size * SVG_STAR_INNER_RADIUS_SCALE;
    return svgPoint(x, y, radius, SVG_START_ANGLE + index * SVG_STAR_ANGLE_STEP);
  });

  return `M${points.join('L')}Z`;
}
