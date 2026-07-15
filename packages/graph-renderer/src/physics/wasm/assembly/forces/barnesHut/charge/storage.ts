let strengthPointer: usize = 0;
let chargePointer: usize = 0;
let chargeXPointer: usize = 0;
let chargeYPointer: usize = 0;

export function initializeCharges(
  nextStrengthPointer: usize,
  nextChargePointer: usize,
  nextChargeXPointer: usize,
  nextChargeYPointer: usize,
): void {
  strengthPointer = nextStrengthPointer;
  chargePointer = nextChargePointer;
  chargeXPointer = nextChargeXPointer;
  chargeYPointer = nextChargeYPointer;
}

@inline
export function strength(node: i32): f64 {
  return load<f64>(strengthPointer + (<usize>node << 3));
}

@inline
export function setStrength(node: i32, value: f64): void {
  store<f64>(strengthPointer + (<usize>node << 3), value);
}

@inline
export function charge(cell: i32): f64 {
  return load<f64>(chargePointer + (<usize>cell << 3));
}

@inline
export function setCharge(cell: i32, value: f64): void {
  store<f64>(chargePointer + (<usize>cell << 3), value);
}

@inline
export function chargeX(cell: i32): f64 {
  return load<f64>(chargeXPointer + (<usize>cell << 3));
}

@inline
export function setChargeX(cell: i32, value: f64): void {
  store<f64>(chargeXPointer + (<usize>cell << 3), value);
}

@inline
export function chargeY(cell: i32): f64 {
  return load<f64>(chargeYPointer + (<usize>cell << 3));
}

@inline
export function setChargeY(cell: i32, value: f64): void {
  store<f64>(chargeYPointer + (<usize>cell << 3), value);
}
