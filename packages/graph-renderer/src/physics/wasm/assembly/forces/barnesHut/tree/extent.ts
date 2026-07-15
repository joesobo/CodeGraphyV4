let minimumXValue: f64 = 0;
let minimumYValue: f64 = 0;
let maximumXValue: f64 = 0;
let maximumYValue: f64 = 0;
let sizeValue: f64 = 0;
let insertionMinimumXValue: f64 = 0;
let insertionMinimumYValue: f64 = 0;
let insertionSizeValue: f64 = 0;

export function minimumX(): f64 { return minimumXValue; }
export function minimumY(): f64 { return minimumYValue; }
export function maximumX(): f64 { return maximumXValue; }
export function maximumY(): f64 { return maximumYValue; }
export function rootSize(): f64 { return sizeValue; }
export function insertionMinimumX(): f64 { return insertionMinimumXValue; }
export function insertionMinimumY(): f64 { return insertionMinimumYValue; }
export function insertionSize(): f64 { return insertionSizeValue; }
export function setMinimumX(value: f64): void { minimumXValue = value; }
export function setMinimumY(value: f64): void { minimumYValue = value; }
export function setMaximumX(value: f64): void { maximumXValue = value; }
export function setMaximumY(value: f64): void { maximumYValue = value; }
export function setRootSize(value: f64): void { sizeValue = value; }
export function setInsertionMinimumX(value: f64): void { insertionMinimumXValue = value; }
export function setInsertionMinimumY(value: f64): void { insertionMinimumYValue = value; }
export function setInsertionSize(value: f64): void { insertionSizeValue = value; }
