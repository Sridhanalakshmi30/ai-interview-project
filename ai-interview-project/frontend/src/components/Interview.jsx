import React, { useEffect, useRef, useState } from 'react';
import { startInterview, submitAnswer } from '../api.js';

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // stop any previous utterance
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Interview({ candidateId, candidateName, onFinished }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [turnId, setTurnId] = useState(null);
  const [turnNumber, setTurnNumber] = useState(1);
  const [topic, setTopic] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [lastTranscript, setLastTranscript] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const baseTextRef = useRef('');
  const timerRef = useRef(null);

  // Start the interview once when the component mounts.
  useEffect(() => {
    (async () => {
      try {
        const result = await startInterview(candidateId, undefined);
        setSessionId(result.sessionId);
        setTurnId(result.turnId);
        setTurnNumber(result.turnNumber);
        setTopic(result.topic);
        setQuestionText(result.questionText);
        setRemainingSeconds(result.remainingSeconds);
      } catch (err) {
        setError(err.message || 'Could not start the interview.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speak each new question aloud as it arrives.
  useEffect(() => {
    if (questionText) speak(questionText);
  }, [questionText]);

  // Client-side countdown display (server enforces the real cutoff on submit).
  useEffect(() => {
    if (loading || remainingSeconds <= 0) return;
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, sessionId]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      isSpeakingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  function startSpeaking() {
    setError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setError('Speech recognition is not supported in this browser. You can type your answer instead.');
      return;
    }

    setSpeechSupported(true);
    baseTextRef.current = typedAnswer ? typedAnswer.trim() + ' ' : '';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          baseTextRef.current += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      setTypedAnswer(baseTextRef.current + interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone permissions or type your answer.');
        stopSpeaking();
      } else {
        console.warn('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if user has not explicitly stopped speaking
      if (isSpeakingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // ignore if already running
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      isSpeakingRef.current = true;
      setIsSpeaking(true);
    } catch (err) {
      console.warn('Could not start speech recognition:', err);
      setError('Could not access speech recognition. You can type your answer instead.');
    }
  }

  function stopSpeaking() {
    isSpeakingRef.current = false;
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsSpeaking(false);
    setTypedAnswer((prev) => prev.trim());
  }

  async function handleSubmitAnswer() {
    if (isSpeakingRef.current) {
      stopSpeaking();
    }

    const answer = typedAnswer.trim();
    if (!answer) {
      setError('Please type an answer or speak before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await submitAnswer(sessionId, turnId, {
        answerText: answer,
      });

      setLastTranscript(result.transcript || answer);
      setTypedAnswer('');
      baseTextRef.current = '';

      if (result.finished) {
        onFinished(sessionId);
        return;
      }

      setTurnId(result.nextTurn.turnId);
      setTurnNumber(result.nextTurn.turnNumber);
      setTopic(result.nextTurn.topic);
      setQuestionText(result.nextTurn.questionText);
      setRemainingSeconds(result.remainingSeconds);
    } catch (err) {
      setError(err.message || 'Failed to submit your answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h2>Preparing your interview…</h2>
        <p className="hint">The AI is reading your resume and planning questions about your skills, internships, and projects.</p>
      </div>
    );
  }

  if (error && !sessionId) {
    return (
      <div className="card">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="interview-top">
        <span className="badge">Question {turnNumber}</span>
        <span className="badge topic-badge">{topic}</span>
        <span className="timer">⏱ {formatTime(remainingSeconds)}</span>
      </div>

      <h2 className="question-text">{questionText}</h2>
      <button className="secondary-btn small" onClick={() => speak(questionText)}>🔊 Replay question</button>

      {lastTranscript && (
        <div className="transcript-preview">
          <strong>Your last answer:</strong> {lastTranscript}
        </div>
      )}

      <div className="answer-section">
        <label htmlFor="answer">Type or speak your answer</label>
        <textarea
          id="answer"
          rows={4}
          className={isSpeaking ? 'listening' : ''}
          value={typedAnswer}
          onChange={(e) => {
            setTypedAnswer(e.target.value);
            baseTextRef.current = e.target.value;
          }}
          placeholder="Type here, or click Speak answer below…"
          disabled={submitting}
        />

        <div className="voice-controls">
          {!isSpeaking ? (
            <button type="button" className="secondary-btn" onClick={startSpeaking} disabled={submitting}>
              🎤 Speak answer
            </button>
          ) : (
            <button type="button" className="secondary-btn recording" onClick={stopSpeaking}>
              ⏹ Stop speaking
            </button>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-btn" onClick={handleSubmitAnswer} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}
