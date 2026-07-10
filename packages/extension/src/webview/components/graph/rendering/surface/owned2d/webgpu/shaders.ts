export const NODE_SHADER = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) color: vec4f,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) center: vec2f,
  @location(1) radius: vec2f,
  @location(2) color: vec4f,
) -> VertexOutput {
  let corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let local = corners[vertexIndex];
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
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) source: vec2f,
  @location(1) destination: vec2f,
  @location(2) halfWidth: vec2f,
  @location(3) color: vec4f,
) -> VertexOutput {
  let along = array<f32, 6>(0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  let side = array<f32, 6>(-1.0, -1.0, 1.0, 1.0, -1.0, 1.0);
  let delta = destination - source;
  let lengthSquared = max(dot(delta, delta), 0.0000001);
  let normal = vec2f(-delta.y, delta.x) * inverseSqrt(lengthSquared);
  let position = mix(source, destination, along[vertexIndex]) + normal * halfWidth * side[vertexIndex];
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
