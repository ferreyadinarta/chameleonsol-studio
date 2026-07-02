import { useState } from 'react';
import { getConsent, setConsent } from '../utils/consent';
import { GALLERY_KEY } from './Gallery';
import { clearAllSessions } from '../utils/sessionsDB';

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
      <div className="sessions-modal cookie-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sessions-modal-head">
          <span>COOKIES &amp; LOCAL STORAGE</span>
        </div>
        <p className="cookie-copy">
          ChameleonSol saves your PFP gallery and studio sessions on this device only — nothing is sent to a server.
          Accept to remember them between visits, or reject to keep the studio working without saving anything
          locally.
        </p>
        <div className="cookie-actions">
          <button className="stage-btn" onClick={reject}>
            Reject all
          </button>
          <button className="save-pfp-btn" onClick={accept}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
