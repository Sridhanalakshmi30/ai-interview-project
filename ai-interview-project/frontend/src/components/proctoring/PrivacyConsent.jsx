import React, { useRef, useState } from 'react';
import { giveConsent } from '../../api.js';

export default function PrivacyConsent({ candidateId, onAccepted, onDeclined }) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function handleContinue(event) {
    event.preventDefault();
    if (!agreed || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await giveConsent(candidateId);
      onAccepted();
    } catch (err) {
      setError(err.message || 'Could not save consent. Please try again.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="card privacy-consent" aria-labelledby="privacy-title">
      <h2 id="privacy-title">Privacy &amp; monitoring notice</h2>
      <h3>This interview uses</h3>
      <ul>
        <li>Camera</li>
        <li>Microphone</li>
        <li>Fullscreen enforcement</li>
        <li>Browser activity monitoring: tab switches and window focus</li>
      </ul>
      <h3>What is recorded</h3>
      <ul>
        <li>Your typed answers and transcripts of spoken answers.</li>
        <li>Proctoring events, including violations, warnings, and their metadata.</li>
        <li>Proctoring does not continuously record video or audio.</li>
      </ul>
      <h3>What is not collected</h3>
      <ul>
        <li>Camera video is not uploaded or stored. Face detection runs locally in your browser.</li>
        <li>No biometric templates are stored.</li>
        <li>Proctoring audio is not uploaded or stored. If you submit a voice recording as an answer,
          it is uploaded for transcription by Groq and the temporary audio file is deleted from
          this server after processing.</li>
      </ul>
      <p>This data is used only for interview evaluation and integrity review.</p>
      <p>Camera and microphone permission will be requested during the next step, after you agree.</p>
      <form onSubmit={handleContinue}>
        <label className="consent-checkbox">
          <input type="checkbox" checked={agreed} disabled={saving}
            onChange={(event) => setAgreed(event.target.checked)} />
          <span>I have read and agree to the monitoring described above.</span>
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="consent-actions">
          <button type="submit" className="primary-btn" disabled={!agreed || saving}>
            {saving ? 'Saving consent…' : 'I Agree — Continue'}
          </button>
          <button type="button" className="secondary-btn" disabled={saving} onClick={onDeclined}>
            Decline
          </button>
        </div>
      </form>
    </section>
  );
}
