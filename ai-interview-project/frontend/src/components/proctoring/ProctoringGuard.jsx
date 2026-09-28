import React, { useRef, useState } from 'react';
import { useProctoring } from '../../hooks/useProctoring.js';
import SecurityCheckScreen from './SecurityCheckScreen.jsx';
import ViolationWarning from './ViolationWarning.jsx';
import ProctoringStatusBadge from './ProctoringStatusBadge.jsx';
import LockdownOverlay from './LockdownOverlay.jsx';

export default function ProctoringGuard({ children }) {
  const [checksPassed, setChecksPassed] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const videoRef = useRef(null);

  const proctoring = useProctoring({
    sessionId,
    videoRef,
  });

  async function handleStart() {
    const ok = await proctoring.runSecurityCheck();

    if (ok) {
      setChecksPassed(true);
    }

    return ok;
  }

  if (!checksPassed) {
    return (
      <>
        <SecurityCheckScreen
          onStart={handleStart}
          mediaError={proctoring.mediaError}
        />

        <VideoSink
          stream={proctoring.mediaStream}
          videoRef={videoRef}
        />
      </>
    );
  }

  if (proctoring.phase === 'TERMINATED') {
    return (
      <div className="card proctor-terminated" role="alert" aria-live="assertive">
        <h2>🚫 Interview Ended — Malpractice Detected</h2>

        <p>
          Your interview was ended automatically after{' '}
          <strong>
            {proctoring.violationCount} of {proctoring.maxViolations}
          </strong>{' '}
          proctoring violations — repeatedly switching away from, leaving fullscreen, or otherwise
          leaving the secure interview environment. Suspected malpractice has been recorded
          in the interview violation log. You cannot continue this interview.
        </p>

        <p className="hint">
          Your interview activity and answers up to this point have been saved.
        </p>
      </div>
    );
  }

  const childProctoring = {
    phase: proctoring.phase,

    isPaused:
      proctoring.phase === 'PAUSED',

    pausedReason:
      proctoring.pausedReason,

    setQuestionNumber:
      proctoring.setQuestionNumber,

    registerSession:
      setSessionId,

    resume:
      proctoring.resume,

    reportViolation:
      proctoring.reportViolation,
  };


  return (
    <div className="proctor-wrapper">

      <div className="proctor-status-bar">

        <ProctoringStatusBadge
          phase={proctoring.phase}
          violationCount={proctoring.violationCount}
          maxViolations={proctoring.maxViolations}
        />

      </div>

      {proctoring.phase === 'PAUSED' && (
        <div className="proctor-paused-banner">

          <strong>Interview paused.</strong>{' '}

          {proctoring.pausedReason &&
          proctoring.pausedReason.startsWith('CAMERA')
            ? 'Camera connection lost. Please enable your camera to continue the interview.'
            : proctoring.pausedReason &&
              proctoring.pausedReason.startsWith('MIC')
            ? 'Microphone connection lost. Please enable your microphone to continue.'
            : 'Please resolve the issue to continue.'}

          <button
            className="secondary-btn small"
            onClick={proctoring.resume}
            style={{ marginLeft: '0.75rem' }}
          >
            I've fixed it — Resume
          </button>

        </div>
      )}

      <VideoSink stream={proctoring.mediaStream} videoRef={videoRef} />

      {children(childProctoring)}

      {proctoring.locked && (
        <LockdownOverlay
          reason={proctoring.lockedReason}
          onResume={() => proctoring.enterFullscreen && proctoring.enterFullscreen()}
          violationCount={proctoring.violationCount}
          maxViolations={proctoring.maxViolations}
        />
      )}

      <ViolationWarning
        violation={proctoring.lastViolation}
        violationCount={proctoring.violationCount}
        maxViolations={proctoring.maxViolations}
        onContinue={proctoring.dismissWarning}
      />


    </div>
  );
}

function VideoSink({ stream, videoRef }) {
  const [playing, setPlaying] = useState(false);

  React.useEffect(() => {

    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

  }, [stream, videoRef]);

  return (
    <section className="camera-preview" aria-label="Your live camera preview">
      <div className="camera-preview-heading">
        <strong>Your camera</strong>
        <span role="status">{playing ? 'Live' : 'Connecting...'}</span>
      </div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onPlaying={() => setPlaying(true)}
        onWaiting={() => setPlaying(false)}
        onEmptied={() => setPlaying(false)}
        aria-label="Live view of your camera"
      />
      <p>Keep your face visible and well lit.</p>
    </section>
  );
}
