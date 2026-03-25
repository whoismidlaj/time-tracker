export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function getTimezone() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("app_timezone") || DEFAULT_TIMEZONE;
  }
  return DEFAULT_TIMEZONE;
}
