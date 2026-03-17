export interface BidirectionalArrowGeometry {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  tipX: number;
  tipY: number;
  vertexX: number;
  vertexY: number;
}

export function createBidirectionalArrowGeometry(
  tipX: number,
  tipY: number,
  vectorX: number,
  vectorY: number,
  normalX: number,
  normalY: number,
  arrowLength: number,
  arrowHalfWidth: number,
  arrowVertexLength: number,
): BidirectionalArrowGeometry {
  const tailX = tipX - vectorX * arrowLength;
  const tailY = tipY - vectorY * arrowLength;
  const vertexX = tipX - vectorX * arrowVertexLength;
  const vertexY = tipY - vectorY * arrowVertexLength;

  return {
    leftX: tailX + normalX * arrowHalfWidth,
    leftY: tailY + normalY * arrowHalfWidth,
    rightX: tailX - normalX * arrowHalfWidth,
    rightY: tailY - normalY * arrowHalfWidth,
    tipX,
    tipY,
    vertexX,
    vertexY,
  };
}
