const UINT32_RANGE: f64 = 4_294_967_296.0;
let state: u32 = 1;

export function randomState(): u32 { return state; }
export function setRandomState(value: u32): void { state = value; }

export function jiggle(): f64 {
  state = state * 1_664_525 + 1_013_904_223;
  return (<f64>state / UINT32_RANGE - 0.5) * 1e-6;
}
