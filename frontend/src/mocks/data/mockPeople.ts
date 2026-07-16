/**
 * Neutral mock first names for the GRCx prototype.
 * Family names are never displayed.
 *
 * Consistency rules:
 * - Same employee / person ID always maps to the same first name.
 * - Legacy full-name strings are remapped to stable unique first names
 *   so ownership / collaboration string matches keep working.
 */

export const MOCK_FIRST_NAMES = [
  "Ahmed",
  "Mohammed",
  "Sara",
  "Fatimah",
  "Noura",
  "Khalid",
  "Omar",
  "Faisal",
  "Lama",
  "Mona",
  "Yousef",
  "Abdullah",
  "Huda",
  "Mariam",
  "Rayan",
  "Abeer",
  "Reem",
  "Nasser",
  "Majed",
  "Saad",
  "Noor",
  "Dana",
  "Turki",
  "Jawaher",
] as const;

/**
 * Stable legacy full-name → unique first-name map.
 * Each former identity gets a distinct first name so
 * owner/collaborator equality checks remain unambiguous.
 */
export const LEGACY_FULL_NAME_TO_FIRST: Record<string, string> = {
  "Sara Al-Harbi": "Sara",
  "Mohammed Al-Qahtani": "Mohammed",
  "Ahmed Al-Otaibi": "Ahmed",
  "Fatimah Al-Dosari": "Fatimah",
  "Noura Al-Mutairi": "Noura",
  "Khalid Al-Shehri": "Khalid",
  "Sara Al-Mutairi": "Mona",
  "Faisal Al-Qahtani": "Faisal",
  "Noura Al-Harbi": "Lama",
  "Khalid Al-Otaibi": "Majed",
  "Hana Al-Otaibi": "Huda",
  "Fatimah Al-Shahrani": "Mariam",
  "Abdullah Al-Ghamdi": "Abdullah",
  "Noura Al-Dosari": "Dana",
  "Khalid Al-Mutairi": "Saad",
  "Layla Al-Shehri": "Reem",
  "Faisal Al-Shammari": "Yousef",
  "Abdullah Al-Rashid": "Nasser",
  "Omar Al-Harbi": "Omar",
  "Layla Al-Mutairi": "Abeer",
  "Noura Al-Qahtani": "Jawaher",
  "Khalid Al-Dosari": "Turki",
  "Lina Al-Shehri": "Noor",
  "Ahmed Al-Qahtani": "Rayan",
  // Limited pool reuse for sparse supporting personas
  "Nouf Al-Otaibi": "Noor",
  "Rakan Al-Anazi": "Majed",
};

/** Employee ID → first name (Identity module). Keep stable across pages. */
export const EMPLOYEE_ID_TO_FIRST: Record<string, string> = {
  "emp-10241": "Mohammed",
  "emp-10882": "Sara",
  "emp-11003": "Ahmed",
  "emp-11120": "Mariam",
  "emp-11255": "Abdullah",
  "emp-11301": "Dana",
  "emp-11440": "Saad",
  "emp-11512": "Reem",
  "emp-11608": "Yousef",
};

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministic first name for any stable key (employee ID, analyst ID, etc.). */
export function mockFirstNameForKey(key: string): string {
  if (EMPLOYEE_ID_TO_FIRST[key]) return EMPLOYEE_ID_TO_FIRST[key];
  if (LEGACY_FULL_NAME_TO_FIRST[key]) return LEGACY_FULL_NAME_TO_FIRST[key];
  const index = hashKey(key) % MOCK_FIRST_NAMES.length;
  return MOCK_FIRST_NAMES[index];
}

/** Map a display name (legacy full or already first) to a mock first name. */
export function toMockFirstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return trimmed;
  if (LEGACY_FULL_NAME_TO_FIRST[trimmed]) {
    return LEGACY_FULL_NAME_TO_FIRST[trimmed];
  }
  if ((MOCK_FIRST_NAMES as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first;
}

export function mockInitials(firstName: string): string {
  const clean = firstName.trim();
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  return (clean[0] ?? "?").toUpperCase();
}
