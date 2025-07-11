export const safeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && value !== null) {
    // If it's an object, try to extract meaningful text
    const obj = value as Record<string, unknown>;
    if (obj.title) return String(obj.title);
    if (obj.description) return String(obj.description);
    if (obj.example) return String(obj.example);
    if (obj.english) return String(obj.english);
    if (obj.chinese) return String(obj.chinese);
    // Last resort: stringify
    return JSON.stringify(value);
  }
  return String(value);
};