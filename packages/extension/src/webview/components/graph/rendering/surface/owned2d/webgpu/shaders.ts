import {
  OWNED_ARROW_HALF_WIDTH,
  OWNED_ARROW_LENGTH,
} from '../arrowGeometry';
import { OWNED_SELF_LOOP_RADIUS } from '../linkGeometry';

const CAMERA_UNIFORM = /* wgsl */ `
struct CameraUniform {
  center: vec2f,
  graphToClip: vec2f,
  pixelToClip: vec2f,
  arrowOpacity: f32,
  highlightedLinkIndex: f32,
};
@group(0) @binding(0) var<uniform> camera: CameraUniform;
`;

export const NODE_SHADER = /* wgsl */ `
${CAMERA_UNIFORM}
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) fillColor: vec4f,
  @location(2) borderColor: vec4f,
  @location(3) halfSize: vec2f,
  @location(4) shapeBorderAndCorner: vec3f,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) graphCenter: vec2f,
  @location(1) graphHalfSize: vec2f,
  @location(2) fillColor: vec4f,
  @location(3) borderColor: vec4f,
  @location(4) shapeBorderAndCorner: vec3f,
) -> VertexOutput {
  let corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let local = corners[vertexIndex];
  let center = (graphCenter - camera.center) * camera.graphToClip * vec2f(1.0, -1.0);
  let halfSize = max(graphHalfSize, vec2f(0.5));
  var output: VertexOutput;
  output.position = vec4f(center + local * halfSize * camera.graphToClip, 0.0, 1.0);
  output.local = local;
  output.fillColor = fillColor;
  output.borderColor = borderColor;
  output.halfSize = halfSize;
  output.shapeBorderAndCorner = shapeBorderAndCorner;
  return output;
}

fn shapeDistance(point: vec2f, halfSize: vec2f, shapeAndCorner: vec2f) -> f32 {
  let shape = shapeAndCorner.x;
  let cornerRadius = min(shapeAndCorner.y, min(halfSize.x, halfSize.y));
  let absolute = abs(point);
  if (shape < 0.5) { return length(point) - 1.0; }
  if (shape < 2.5 && cornerRadius > 0.0) {
    let graphPoint = point * halfSize;
    let rounded = abs(graphPoint) - (halfSize - vec2f(cornerRadius));
    let graphDistance = length(max(rounded, vec2f(0.0)))
      + min(max(rounded.x, rounded.y), 0.0)
      - cornerRadius;
    return graphDistance / max(min(halfSize.x, halfSize.y), 0.5);
  }
  if (shape < 2.5) { return max(absolute.x, absolute.y) - 1.0; }
  if (shape < 3.5) { return absolute.x + absolute.y - 1.0; }
  if (shape < 4.5) {
    return max(absolute.x * 0.866025 - point.y * 0.5, point.y) - 0.5;
  }
  if (shape < 5.5) {
    return max(absolute.x * 0.866025 + absolute.y * 0.5, absolute.y) - 1.0;
  }
  let angle = atan2(point.y, point.x);
  let spike = 0.5 + 0.5 * cos(angle * 5.0);
  let starRadius = 0.48 + 0.52 * spike * spike;
  return length(point) - starRadius;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let distance = shapeDistance(
    input.local,
    input.halfSize,
    vec2f(input.shapeBorderAndCorner.x, input.shapeBorderAndCorner.z),
  );
  let antialias = max(fwidth(distance), 0.002);
  let coverage = 1.0 - smoothstep(-antialias, antialias, distance);
  if (coverage <= 0.0) { discard; }
  let zoom = max(camera.graphToClip.x / camera.pixelToClip.x, 0.0001);
  let borderDistance = input.shapeBorderAndCorner.y / max(min(input.halfSize.x, input.halfSize.y) * zoom, 1.0);
  let innerCoverage = 1.0 - smoothstep(-antialias, antialias, distance + borderDistance);
  let color = mix(input.borderColor, input.fillColor, innerCoverage);
  return vec4f(color.rgb, color.a * coverage);
}
`;

export const OWNED_LINK_SEGMENTS = 16;

export const LINK_SHADER = /* wgsl */ `
${CAMERA_UNIFORM}
struct LinkVertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) edgeDistance: f32,
  @location(2) @interpolate(flat) halfWidth: f32,
};

struct ArrowVertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

fn curvePoint(
  source: vec2f,
  destination: vec2f,
  control: vec2f,
  curvature: f32,
  t: f32,
) -> vec2f {
  let inverse = 1.0 - t;
  if (distance(source, destination) <= 0.0001) {
    let radius = max(0.5, abs(curvature)) * ${OWNED_SELF_LOOP_RADIUS};
    let firstControl = source + vec2f(0.0, -radius);
    let secondControl = source + vec2f(radius, 0.0);
    return inverse * inverse * inverse * source
      + 3.0 * inverse * inverse * t * firstControl
      + 3.0 * inverse * t * t * secondControl
      + t * t * t * destination;
  }
  return inverse * inverse * source + 2.0 * inverse * t * control + t * t * destination;
}

fn curveTangent(
  source: vec2f,
  destination: vec2f,
  control: vec2f,
  curvature: f32,
  t: f32,
) -> vec2f {
  let inverse = 1.0 - t;
  if (distance(source, destination) <= 0.0001) {
    let radius = max(0.5, abs(curvature)) * ${OWNED_SELF_LOOP_RADIUS};
    let firstControl = source + vec2f(0.0, -radius);
    let secondControl = source + vec2f(radius, 0.0);
    return 3.0 * inverse * inverse * (firstControl - source)
      + 6.0 * inverse * t * (secondControl - firstControl)
      + 3.0 * t * t * (destination - secondControl);
  }
  return 2.0 * inverse * (control - source) + 2.0 * t * (destination - control);
}

fn curveControl(source: vec2f, destination: vec2f, curvature: f32) -> vec2f {
  let graphDelta = destination - source;
  var control = mix(source, destination, 0.5);
  if (length(graphDelta) > 0.0001) {
    control += vec2f(graphDelta.y, -graphDelta.x) * curvature;
  }
  return control;
}

@vertex
fn linkVertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
  @location(0) graphSource: vec2f,
  @location(1) graphDestination: vec2f,
  @location(2) halfWidthAndCurvature: vec2f,
  @location(3) color: vec4f,
) -> LinkVertexOutput {
  let side = select(-1.0, 1.0, vertexIndex % 2u == 1u);
  let t = f32(vertexIndex / 2u) / f32(${OWNED_LINK_SEGMENTS});
  let control = curveControl(graphSource, graphDestination, halfWidthAndCurvature.y);
  let graphPosition = curvePoint(
    graphSource,
    graphDestination,
    control,
    halfWidthAndCurvature.y,
    t,
  );
  let graphTangent = curveTangent(
    graphSource,
    graphDestination,
    control,
    halfWidthAndCurvature.y,
    t,
  );
  let tangent = graphTangent * camera.graphToClip * vec2f(1.0, -1.0);
  let lengthSquared = max(dot(tangent, tangent), 0.0000001);
  let normal = vec2f(-tangent.y, tangent.x) * inverseSqrt(lengthSquared);
  let center = (graphPosition - camera.center) * camera.graphToClip * vec2f(1.0, -1.0);
  let highlighted = abs(f32(instanceIndex) - camera.highlightedLinkIndex) < 0.5;
  let halfWidth = select(
    halfWidthAndCurvature.x,
    max(1.5, halfWidthAndCurvature.x + 1.0),
    highlighted,
  );
  let outerHalfWidth = halfWidth + 1.0;

  var output: LinkVertexOutput;
  output.position = vec4f(
    center + normal * camera.pixelToClip * outerHalfWidth * side,
    0.0,
    1.0,
  );
  output.color = select(
    color,
    vec4f(color.rgb, max(color.a, 0.95)),
    highlighted,
  );
  output.edgeDistance = outerHalfWidth * side;
  output.halfWidth = halfWidth;
  return output;
}

@fragment
fn linkFragmentMain(input: LinkVertexOutput) -> @location(0) vec4f {
  let coverage = 1.0 - smoothstep(
    input.halfWidth,
    input.halfWidth + 1.0,
    abs(input.edgeDistance),
  );
  if (coverage <= 0.0) { discard; }
  return vec4f(input.color.rgb, input.color.a * coverage);
}

@vertex
fn arrowVertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) graphSource: vec2f,
  @location(1) graphDestination: vec2f,
  @location(2) halfWidthAndCurvature: vec2f,
  @location(4) arrowColor: vec4f,
  @location(5) arrowCurveParameters: vec2f,
  @location(6) bidirectional: f32,
) -> ArrowVertexOutput {
  let reverseArrow = vertexIndex >= 3u;
  let corner = vertexIndex % 3u;
  let curvature = halfWidthAndCurvature.y;
  let control = curveControl(graphSource, graphDestination, curvature);
  let tipParameter = select(
    arrowCurveParameters.y,
    arrowCurveParameters.x,
    reverseArrow,
  );
  let tip = curvePoint(
    graphSource,
    graphDestination,
    control,
    curvature,
    tipParameter,
  );
  let tipTangent = curveTangent(
    graphSource,
    graphDestination,
    control,
    curvature,
    tipParameter,
  );
  let parameterOffset = min(
    0.5,
    ${OWNED_ARROW_LENGTH} / max(length(tipTangent), ${OWNED_ARROW_LENGTH}),
  );
  var baseParameter = select(
    max(0.0, tipParameter - parameterOffset),
    min(1.0, tipParameter + parameterOffset),
    reverseArrow,
  );
  var base = curvePoint(
    graphSource,
    graphDestination,
    control,
    curvature,
    baseParameter,
  );
  let correctedOffset = min(
    0.5,
    parameterOffset * ${OWNED_ARROW_LENGTH} / max(distance(tip, base), 0.0001),
  );
  baseParameter = select(
    max(0.0, tipParameter - correctedOffset),
    min(1.0, tipParameter + correctedOffset),
    reverseArrow,
  );
  base = curvePoint(
    graphSource,
    graphDestination,
    control,
    curvature,
    baseParameter,
  );
  var axis = tip - base;
  if (dot(axis, axis) <= 0.0000001) {
    axis = select(tipTangent, -tipTangent, reverseArrow);
  }
  let direction = normalize(axis);
  let normal = vec2f(-direction.y, direction.x);
  var graphVertex = tip;
  if (corner == 1u) { graphVertex = base + normal * ${OWNED_ARROW_HALF_WIDTH}; }
  if (corner == 2u) { graphVertex = base - normal * ${OWNED_ARROW_HALF_WIDTH}; }

  var output: ArrowVertexOutput;
  output.position = vec4f(
    (graphVertex - camera.center) * camera.graphToClip * vec2f(1.0, -1.0),
    0.0,
    1.0,
  );
  output.color = vec4f(arrowColor.rgb, arrowColor.a * camera.arrowOpacity);
  if (reverseArrow && bidirectional < 0.5) { output.color.a = 0.0; }
  return output;
}

@fragment
fn arrowFragmentMain(input: ArrowVertexOutput) -> @location(0) vec4f {
  return input.color;
}
`;
