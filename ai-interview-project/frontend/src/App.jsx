import React, { useState } from 'react';
import ResumeUpload from './components/ResumeUpload.jsx';
import Interview from './components/Interview.jsx';
import Report from './components/Report.jsx';
import ProctoringGuard from './components/proctoring/ProctoringGuard.jsx';
import PrivacyConsent from './components/proctoring/PrivacyConsent.jsx';

export default function App() {
  const [step, setStep] = useState('upload');
  const [candidateId, setCandidateId] = useState(null);
  const [candidateName, setCandidateName] = useState('');
  const [sessionId, setSessionId] = useState(null);

  function handleResumeReady(id, name) {
    setCandidateId(id);
    setCandidateName(name || 'Candidate');
    setStep('consent');
  }

  function handleInterviewFinished(finishedSessionId) {
    setSessionId(finishedSessionId);
    setStep('report');
  }

  function handleRestart() {
    setCandidateId(null);
    setSessionId(null);
    setCandidateName('');
    setStep('upload');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>AI Interview Module</h1>
        <p className="subtitle">Resume-based adaptive technical interview</p>
      </header>

      <main className="app-main">
        {step === 'upload' && <ResumeUpload onReady={handleResumeReady} />}

        {step === 'consent' && (
          <PrivacyConsent candidateId={candidateId} onAccepted={() => setStep('interview')}
            onDeclined={() => setStep('declined')} />
        )}

        {step === 'declined' && (
          <section className="card" aria-labelledby="consent-declined-title">
            <h2 id="consent-declined-title">Interview cannot proceed</h2>
            <p>You declined the monitoring notice. Consent is required to take this interview.</p>
            <p>No camera or microphone access was requested, and monitoring has not started.</p>
            <button className="secondary-btn" onClick={handleRestart}>Return to resume upload</button>
          </section>
        )}

        {step === 'interview' && (
          <ProctoringGuard candidateId={candidateId} key={candidateId}>
            {(proctoring) => (

              <Interview
                candidateId={candidateId}
                candidateName={candidateName}
                onFinished={handleInterviewFinished}
                onQuit={() => setStep('quit')}
                proctoring={proctoring}
              />
            )}
          </ProctoringGuard>
        )}

        {step === 'report' && (
          <Report sessionId={sessionId} onRestart={handleRestart} />
        )}
        {step === 'quit' && (
          <section className="card">
            <h2>You have quit the interview</h2>
            <p>Your submitted answers have been saved. Your unfinished answer was discarded.</p>
            <button className="secondary-btn" onClick={handleRestart}>Return to resume upload</button>
          </section>
        )}
      </main>
    </div>
  );
}
