/**
 * Validierungsfunktionen für Formulare
 * Wiederverwendbar in Register.tsx und ProjektFormular.tsx
 */

/**
 * Prüft ob eine E-Mail-Adresse gültig ist
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Prüft ob eine Telefonnummer gültig ist (flexible Formate)
 * Erlaubt: +49 123 456789, 0123-456789, (0123) 456789, etc.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return true; // Optional - leere Strings sind OK
  // Entferne alle erlaubten Zeichen und prüfe ob nur Ziffern übrig bleiben
  const cleaned = phone.replace(/[\s\-\(\)\+\/]/g, '');
  // Mindestens 6 Ziffern, maximal 15
  return /^\d{6,15}$/.test(cleaned);
}

/**
 * Prüft ob eine URL gültig ist
 */
export function isValidUrl(url: string): boolean {
  if (!url) return true; // Optional - leere Strings sind OK
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Prüft ob eine Postleitzahl gültig ist (DE/AT/CH: 4-5 Ziffern)
 */
export function isValidZip(zip: string): boolean {
  if (!zip) return true; // Optional - leere Strings sind OK
  return /^\d{4,5}$/.test(zip.trim());
}

/**
 * Prüft ob ein Name gültig ist (min. 2 Zeichen, Buchstaben/Bindestriche/Leerzeichen)
 */
export function isValidName(name: string): boolean {
  if (!name) return false;
  // Erlaubt Buchstaben (inkl. Umlaute), Bindestriche, Apostrophe, Leerzeichen
  return name.trim().length >= 2 && /^[\p{L}\s\-']+$/u.test(name.trim());
}

/**
 * Prüft ob ein Passwort stark genug ist
 * Min. 8 Zeichen, mindestens 1 Zahl
 */
export function isValidPassword(password: string): boolean {
  if (!password) return false;
  return password.length >= 8 && /\d/.test(password);
}

/**
 * Prüft ob ein Datum in der Zukunft liegt
 */
export function isDateInFuture(dateString: string): boolean {
  if (!dateString) return true; // Optional - leere Strings sind OK
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Prüft ob ein String mindestens X Zeichen hat
 */
export function hasMinLength(value: string, minLength: number): boolean {
  if (!value) return false;
  return value.trim().length >= minLength;
}

/**
 * Validierungsfehler-Typ für konsistentes Error-Handling
 */
export interface ValidationErrors {
  [field: string]: string | undefined;
}

/**
 * Hilfsfunktion: Gibt Fehlermeldung zurück wenn Bedingung nicht erfüllt
 */
export function validateField(
  value: string,
  validators: Array<{ check: (v: string) => boolean; message: string }>
): string | undefined {
  for (const { check, message } of validators) {
    if (!check(value)) {
      return message;
    }
  }
  return undefined;
}
