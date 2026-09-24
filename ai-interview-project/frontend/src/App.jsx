import React, { useState } from 'react';
import ResumeUpload from './components/ResumeUpload.jsx';
import Interview from './components/Interview.jsx';
import Report from './components/Report.jsx';

export default function App() {
  // step: 'upload' -> 'interview' -> 'report'
  const [step, setStep] = useState('upload');
  const [candidateId, setCandidateId] = useState(null);
  const [candidateName, setCandidateName] = useState('');
  const [sessionId, setSessionId] = useState(null);

  function handleResumeReady(id, name) {
    setCandidateId(id);
    setCandidateName(name || 'Candidate');
    setStep('interview');
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
        {step === 'interview' && (
          <Interview
            candidateId={candidateId}
            candidateName={candidateName}
            onFinished={handleInterviewFinished}
          />
        )}
        {step === 'report' && <Report sessionId={sessionId} onRestart={handleRestart} />}
      </main>
    </div>
  );
}
