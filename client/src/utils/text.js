const LEADING_NUMBER_PATTERN = /^\s*\d+\s*[.):-]\s*/;

export function stripLeadingNumber(text) {
  return text.replace(LEADING_NUMBER_PATTERN, "").trim();
}
