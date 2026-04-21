/** Title property */
export function title(value) {
  return { title: [{ text: { content: value || "" } }] };
}

/** Rich text property */
export function richText(value) {
  if (!value) return { rich_text: [] };
  return { rich_text: [{ text: { content: String(value) } }] };
}

/** Email property */
export function email(value) {
  return { email: value || null };
}

/** Phone number property */
export function phoneNumber(value) {
  return { phone_number: value || null };
}

/** Select property */
export function select(value) {
  if (!value) return { select: null };
  return { select: { name: value } };
}

/** Status property */
export function status(value) {
  if (!value) return { status: null };
  return { status: { name: value } };
}

/** Multi-select property */
export function multiSelect(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { multi_select: [] };
  }
  return { multi_select: values.map((v) => ({ name: v })) };
}

/** Checkbox property */
export function checkbox(value) {
  return { checkbox: !!value };
}

/** Date property (date only, no time) */
export function dateOnly(startDate) {
  if (!startDate) return { date: null };
  return { date: { start: startDate } };
}

/** Date property (with datetime ISO) */
export function dateTime(startDatetime) {
  if (!startDatetime) return { date: null };
  return { date: { start: startDatetime } };
}

/** Person property (array of user objects) */
export function people(userIds) {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return { people: [] };
  }
  return { people: userIds.map((id) => ({ object: "user", id })) };
}

/** Relation property (array of page references) */
export function relation(pageIds) {
  if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
    return { relation: [] };
  }
  return { relation: pageIds.map((id) => ({ id })) };
}

/**
 * Parse a Notion page URL to extract the page ID.
 */
export function parseNotionPageId(url) {
  if (!url) return null;
  const match = url.match(/([a-f0-9]{32})$/);
  if (!match) return null;
  const raw = match[1];
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

/**
 * Parse JSON-encoded multi-select strings from Notion export.
 */
export function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [value];
  }
}
