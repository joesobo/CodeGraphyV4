const CAMERA_UNIFORM = /* wgsl */ `
struct CameraUniform {
  center: vec2f,
  graphToClip: vec2f,
  pixelToClip: vec2f,
  _padding: vec2f,
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
  @location(4) shapeAndBorder: vec2f,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) graphCenter: vec2f,
  @location(1) graphHalfSize: vec2f,
  @location(2) fillColor: vec4f,
  @location(3) borderColor: vec4f,
  @location(4) shapeAndBorder: vec2f,
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
  output.shapeAndBorder = shapeAndBorder;
  return output;
}

fn shapeDistance(point: vec2f, shape: f32) -> f32 {
  let absolute = abs(point);
  if (shape < 0.5) { return length(point) - 1.0; }
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
  let distance = shapeDistance(input.local, input.shapeAndBorder.x);
  let antialias = max(fwidth(distance), 0.002);
  let coverage = 1.0 - smoothstep(-antialias, antialias, distance);
  if (coverage <= 0.0) { discard; }
  let zoom = max(camera.graphToClip.x / camera.pixelToClip.x, 0.0001);
  let borderDistance = input.shapeAndBorder.y / max(min(input.halfSize.x, input.halfSize.y) * zoom, 1.0);
  let innerCoverage = 1.0 - smoothstep(-antialias, antialias, distance + borderDistance);
  let color = mix(input.borderColor, input.fillColor, innerCoverage);
  return vec4f(color.rgb, color.a * coverage);
}
`;

export const LINK_SHADER = /* wgsl */ `
${CAMERA_UNIFORM}
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

fn curvePoint(source: vec2f, destination: vec2f, control: vec2f, t: f32) -> vec2f {
  let inverse = 1.0 - t;
  return inverse * inverse * source + 2.0 * inverse * t * control + t * t * destination;
}

fn curveTangent(source: vec2f, destination: vec2f, control: vec2f, t: f32) -> vec2f {
  let inverse = 1.0 - t;
  return 2.0 * inverse * (control - source) + 2.0 * t * (destination - control);
}

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) graphSource: vec2f,
  @location(1) graphDestination: vec2f,
  @location(2) halfWidthAndCurvature: vec2f,
  @location(3) color: vec4f,
  @location(4) arrowColor: vec4f,
  @location(5) bidirectional: f32,
) -> VertexOutput {
  let graphDelta = graphDestination - graphSource;
  let graphDistance = length(graphDelta);
  var control = mix(graphSource, graphDestination, 0.5);
  if (graphDistance > 0.0001) {
    control += vec2f(-graphDelta.y, graphDelta.x) * halfWidthAndCurvature.y;
  }

  var output: VertexOutput;
  if (vertexIndex >= 24u) {
    let arrowAlong = array<f32, 3>(1.0, -0.6, -0.6);
    let arrowSide = array<f32, 3>(0.0, 0.55, -0.55);
    let reverseArrow = vertexIndex >= 27u;
    let corner = (vertexIndex - 24u) % 3u;
    let arrowPosition = select(0.72, 0.28, reverseArrow);
    let graphPosition = curvePoint(graphSource, graphDestination, control, arrowPosition);
    var graphTangent = curveTangent(graphSource, graphDestination, control, arrowPosition);
    if (reverseArrow) { graphTangent = -graphTangent; }
    let rawTangent = graphTangent * camera.graphToClip * vec2f(1.0, -1.0);
    let tangent = rawTangent * inverseSqrt(max(dot(rawTangent, rawTangent), 0.0000001));
    let normal = vec2f(-tangent.y, tangent.x);
    let center = (graphPosition - camera.center) * camera.graphToClip * vec2f(1.0, -1.0);
    output.position = vec4f(
      center + tangent * camera.pixelToClip * 8.0 * arrowAlong[corner]
        + normal * camera.pixelToClip * 8.0 * arrowSide[corner],
      0.0,
      1.0,
    );
    output.color = arrowColor;
    if (reverseArrow && bidirectional < 0.5) { output.color.a = 0.0; }
    return output;
  }

  let along = array<f32, 6>(0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  let side = array<f32, 6>(-1.0, -1.0, 1.0, 1.0, -1.0, 1.0);
  let segmentCount = 4.0;
  let segment = f32(vertexIndex / 6u);
  let corner = vertexIndex % 6u;
  let t = (segment + along[corner]) / segmentCount;
  let graphPosition = curvePoint(graphSource, graphDestination, control, t);
  let graphTangent = curveTangent(graphSource, graphDestination, control, t);
  let tangent = graphTangent * camera.graphToClip * vec2f(1.0, -1.0);
  let lengthSquared = max(dot(tangent, tangent), 0.0000001);
  let normal = vec2f(-tangent.y, tangent.x) * inverseSqrt(lengthSquared);
  let center = (graphPosition - camera.center) * camera.graphToClip * vec2f(1.0, -1.0);
  let width = halfWidthAndCurvature.x * camera.pixelToClip;
  output.position = vec4f(center + normal * width * side[corner], 0.0, 1.0);
  output.color = color;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}
`;
