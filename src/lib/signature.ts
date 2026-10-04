const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
const MIN_LENGTH = 1_000;
const MAX_LENGTH = 150_000;

export function acceptedSignature(value: string): string | null {
  if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) return null;
  if (!PNG_DATA_URL.test(value)) return null;
  return value;
}
