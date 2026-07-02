// The choice itself must persist across reloads (otherwise the prompt would
// show every visit), so it's stored unconditionally — the one universally
// recognized "strictly necessary" exception in cookie/consent law.
const KEY = 'chameleonsol-consent';

export type Consent = 'accepted' | 'rejected';

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'accepted' || v === 'rejected' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* ignore — worst case the prompt reappears next visit */
  }
}

// Everything else the app stores locally (the PFP gallery, saved sessions)
// is optional convenience, not required for the 3D painting itself to work
// — so a rejection just means "don't remember anything across visits."
export function storageAllowed(): boolean {
  return getConsent() !== 'rejected';
}
