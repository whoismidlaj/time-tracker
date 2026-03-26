export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_START_TIME = "09:30";
export const DEFAULT_END_TIME = "18:30";
export const DEFAULT_BREAK_HOURS = 1;

export function getTimezone() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("app_timezone") || DEFAULT_TIMEZONE;
  }
  return DEFAULT_TIMEZONE;
}

export function getOfficeStartTime() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("app_start_time") || DEFAULT_START_TIME;
  }
  return DEFAULT_START_TIME;
}

export function getOfficeEndTime() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("app_end_time") || DEFAULT_END_TIME;
  }
  return DEFAULT_END_TIME;
}

export function getBreakHours() {
  if (typeof window !== "undefined") {
    return parseFloat(localStorage.getItem("app_break_hours")) || DEFAULT_BREAK_HOURS;
  }
  return DEFAULT_BREAK_HOURS;
}
