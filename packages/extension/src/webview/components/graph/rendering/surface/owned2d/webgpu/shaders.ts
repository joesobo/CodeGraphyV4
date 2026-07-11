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
  @location(1) color: vec4f,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) graphCenter: vec2f,
  @location(1) graphRadius: vec2f,
  @location(2) color: vec4f,
) -> VertexOutput {
  let corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let local = corners[vertexIndex];
  let center = (graphCenter - camera.center) * camera.graphToClip * vec2f(1.0, -1.0);
  let radius = graphRadius.x * camera.graphToClip;
  var output: VertexOutput;
  output.position = vec4f(center + local * radius, 0.0, 1.0);
  output.local = local;
  output.color = color;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let distance = length(input.local);
  let coverage = 1.0 - smoothstep(0.88, 1.0, distance);
  if (coverage <= 0.0) {
    discard;
  }
  return vec4f(input.color.rgb, input.color.a * coverage);
}
`;

export const LINK_SHADER = /* wgsl */ `
${CAMERA_UNIFORM}
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) graphSource: vec2f,
  @location(1) graphDestination: vec2f,
  @location(2) halfWidthAndCurvature: vec2f,
  @location(3) color: vec4f,
) -> VertexOutput {
  let along = array<f32, 6>(0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  let side = array<f32, 6>(-1.0, -1.0, 1.0, 1.0, -1.0, 1.0);
  let segmentCount = 4.0;
  let segment = f32(vertexIndex / 6u);
  let corner = vertexIndex % 6u;
  let t = (segment + along[corner]) / segmentCount;
  let graphDelta = graphDestination - graphSource;
  let graphDistance = length(graphDelta);
  var control = mix(graphSource, graphDestination, 0.5);
  if (graphDistance > 0.0001) {
    control += vec2f(-graphDelta.y, graphDelta.x)
      * halfWidthAndCurvature.y;
  }
  let inverse = 1.0 - t;
  let graphPosition = inverse * inverse * graphSource
    + 2.0 * inverse * t * control
    + t * t * graphDestination;
  let graphTangent = 2.0 * inverse * (control - graphSource)
    + 2.0 * t * (graphDestination - control);
  let tangent = graphTangent * camera.graphToClip * vec2f(1.0, -1.0);
  let lengthSquared = max(dot(tangent, tangent), 0.0000001);
  let normal = vec2f(-tangent.y, tangent.x) * inverseSqrt(lengthSquared);
  let center = (graphPosition - camera.center) * camera.graphToClip * vec2f(1.0, -1.0);
  let width = halfWidthAndCurvature.x * camera.pixelToClip;
  let position = center + normal * width * side[corner];
  var output: VertexOutput;
  output.position = vec4f(position, 0.0, 1.0);
  output.color = color;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}
`;
