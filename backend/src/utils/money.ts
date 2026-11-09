export function rupeesToPaise(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid monetary value");
  }
  return Math.round(value * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function assertNonNegativePaise(paise: number, field = "amount"): void {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`${field} must be a non-negative integer amount in paise`);
  }
}
