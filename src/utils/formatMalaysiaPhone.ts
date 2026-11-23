export function formatMalaysiaPhone(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;

  let local = digits;
  if (digits.startsWith('60') && digits.length >= 10) {
    local = digits.slice(2);
  } else if (digits.startsWith('0')) {
    local = digits.slice(1);
  }

  // 11-digit mobile numbers (011 / 015 -> 10 digits after +60)
  if ((local.startsWith('11') || local.startsWith('15')) && local.length === 10) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 6)} ${local.slice(6, 10)}`;
  }

  // Standard 10-digit mobile numbers (e.g., 012-345 6789 -> 9 digits after +60)
  if (local.startsWith('1') && local.length === 9) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 5)} ${local.slice(5, 9)}`;
  }

  // Fallback for other 10-digit mobile lengths starting with 1
  if (local.startsWith('1') && local.length === 10) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 6)} ${local.slice(6, 10)}`;
  }

  // Klang Valley landline (03-XXXX XXXX -> 9 digits starting with 3)
  if (local.startsWith('3') && local.length === 9) {
    return `+60 ${local.slice(0, 1)}-${local.slice(1, 5)} ${local.slice(5, 9)}`;
  }

  return raw;
}
