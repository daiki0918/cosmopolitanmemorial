export function normalizePhone(phone?: string) {
  if (!phone) return phone;
  const compact = phone.replace(/[\s()-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`;
  if (/^9\d{9}$/.test(compact)) return `+63${compact}`;
  if (/^639\d{9}$/.test(compact)) return `+${compact}`;
  return phone;
}
