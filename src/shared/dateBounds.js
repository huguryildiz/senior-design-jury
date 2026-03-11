// Shared date bounds for admin date inputs and filters.
export const APP_DATE_MIN_YEAR = 2000;
export const APP_DATE_MAX_YEAR = 2100;
export const APP_DATE_MIN_DATE = `${APP_DATE_MIN_YEAR}-01-01`;
export const APP_DATE_MAX_DATE = `${APP_DATE_MAX_YEAR}-12-31`;
export const APP_DATE_MIN_DATETIME = `${APP_DATE_MIN_DATE}T00:00`;
export const APP_DATE_MAX_DATETIME = `${APP_DATE_MAX_DATE}T23:59`;

export function isValidDateParts(yyyy, mm, dd, { minYear = APP_DATE_MIN_YEAR, maxYear = APP_DATE_MAX_YEAR } = {}) {
  if (yyyy < minYear || yyyy > maxYear) return false;
  if (mm < 1 || mm > 12) return false;
  if (dd < 1) return false;
  const maxDays = new Date(yyyy, mm, 0).getDate();
  return dd <= maxDays;
}

export function isIsoDateWithinBounds(
  value,
  { minDate = APP_DATE_MIN_DATE, maxDate = APP_DATE_MAX_DATE } = {}
) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [yyyy, mm, dd] = v.split("-").map(Number);
  if (!isValidDateParts(yyyy, mm, dd)) return false;
  return v >= minDate && v <= maxDate;
}
