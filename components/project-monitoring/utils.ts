export const fmt = (n: number): string => (n === 0 ? "—" : n.toLocaleString());
export const fmtK = (n: number): string =>
  n === 0 ? "—" : `₱${n.toLocaleString()}K`;
