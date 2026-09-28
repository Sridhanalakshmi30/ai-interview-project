import React, { useState } from 'react';

function isSupportedBrowser() {
  const ua = navigator.userAgent;

  const isChrome =
    /Chrome\//.test(ua) &&
    !/Edg\//.test(ua) &&
    !/OPR\//.test(ua);

  const isEdge =
    /Edg\//.test(ua);

  return isChrome || isEdge;
}

function CheckRow({ label, state }) {

  const icon =
    state === 'ok'
      ? '✓'
      : state === 'fail'
      ? '✕'
      : '…';

  const cls =
    state === 'ok'
      ? 'proctor-check ok'
      : state === 'fail'
      ? 'proctor-check fail'
      : 'proctor-check pending';

  return (
    <div className={cls}>
      <span className="proctor-check-icon">
        {icon}
      </span>

      {label}
    </div>
  );
}

export default function SecurityCheckScreen({
  onStart,
  mediaError,
  browserSupported,
}) {

  const [starting, setStarting] = useState(false);
  const [localError, setLocalError] = useState('');

  const supported =
    browserSupported ?? isSupportedBrowser();

  async function handleStart() {

    setStarting(true);
    setLocalError('');

    const ok = await onStart();

    if (!ok) {
      setStarting(false);
      setLocalError('Allow camera, microphone, and fullscreen access to start the interview.');
    }
  }

  return (
    <div className="card proctor-security-check">

      <h2>Interview Security Check</h2>

      <p className="hint">
        This interview uses camera, microphone, fullscreen,
        and browser activity monitoring for interview integrity.
      </p>

      <div className="proctor-check-list">

        <CheckRow
          label="Google Chrome or Microsoft Edge"
          state={supported ? 'ok' : 'fail'}
        />

        <CheckRow
          label="Camera access"
          state="pending"
        />

        <CheckRow
          label="Microphone access"
          state="pending"
        />

        <CheckRow
          label="Fullscreen mode"
          state="pending"
        />

        <CheckRow
          label="Proctoring monitoring"
          state="pending"
        />

      </div>

      {!supported && (
        <p className="error-text">
          Please use the latest Chrome or Edge browser.
        </p>
      )}

      {mediaError && (
        <p className="error-text">
          {mediaError}
        </p>
      )}

      {localError && (
        <p className="error-text">
          {localError}
        </p>
      )}

      <button
        className="primary-btn"
        onClick={handleStart}
        disabled={!supported || starting}
      >
        {starting
          ? 'Checking…'
          : 'Start Interview'}
      </button>

      <p className="hint proctor-note">
        Camera and microphone access are required.
        Fullscreen mode will also be requested.
        Leaving fullscreen or switching tabs triggers a warning. The fourth
        violation ends the interview and displays a suspected malpractice notification.
      </p>

    </div>
  );
}
