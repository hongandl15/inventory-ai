export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

export function formatCurrency(value, locale = 'vi-VN', currency = 'VND') {
  if (value === null || value === undefined || isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value));
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default { formatNumber, formatCurrency, formatDate };
