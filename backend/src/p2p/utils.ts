/**
 * Narrow Express route params (which type as `string | string[]`)
 * to a plain `string`. Throws if somehow undefined.
 */
export const param = (v: string | string[]): string =>
  Array.isArray(v) ? v[0] : v;
