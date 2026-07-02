import { useState } from 'react';
import { getConsent, setConsent } from '../utils/consent';
import { GALLERY_KEY } from './Gallery';
import { clearAllSessions } from '../utils/sessionsDB';

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default function CookieConsent() {
  const [open, setOpen] = useState(() => getConsent() === null);

  if (!open) return null;

  const accept = () => {
    setConsent('accepted');
    setOpen(false);
  };

  const reject = () => {
    setConsent('rejected');
    // Actually forget what's already there too, not just stop future saves.
    try {
      localStorage.removeItem(GALLERY_KEY);
    } catch {
      /* ignore */
    }
    clearAllSessions().catch(() => {});
    setOpen(false);
  };

  return (
    <div className="pfp-modal-overlay cookie-overlay">
      <div className="cookie-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cookie-icon">
          <ShieldIcon />
        </div>
        <div className="cookie-title">Your data, your device</div>
        <p className="cookie-copy">ChameleonSol saves things locally so you don't lose your work.</p>
        <ul className="cookie-points">
          <li>Nothing ever leaves your device — no server, no tracking</li>
          <li>Just your PFP gallery and saved studio sessions</li>
        </ul>
        <div className="cookie-actions">
          <button className="cookie-btn-reject" onClick={reject}>
            Reject all
          </button>
          <button className="cookie-btn-accept" onClick={accept}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
