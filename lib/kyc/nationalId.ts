/** Iranian national ID checksum — safe for client + server. */
export function isValidIranianNationalId(raw: string): boolean {
  if (!/^\d{10}$/.test(raw)) return false;
  if (/^(\d)\1{9}$/.test(raw)) return false;
  const check = Number(raw[9]);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(raw[i]) * (10 - i);
  }
  const rem = sum % 11;
  return rem < 2 ? check === rem : check + rem === 11;
}
