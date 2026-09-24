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
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
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

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });

      const preferredMimeType = ['audio/webm;codecs=opus', 'audio/webm'].find((type) =>
        MediaRecorder.isTypeSupported(type)
      );
      const recorder = new MediaRecorder(stream, {
        ...(preferredMimeType ? { mimeType: preferredMimeType } : {}),
        audioBitsPerSecond: 128000,
      });

      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: preferredMimeType || 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access was denied or is unavailable. You can type your answer instead.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!typedAnswer.trim() && !audioBlob) {
      setError('Please type an answer or record your voice before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await submitAnswer(sessionId, turnId, {
        answerText: typedAnswer.trim(),
        audioBlob
      });

      setLastTranscript(result.transcript);
      setTypedAnswer('');
      setAudioBlob(null);

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
        <label htmlFor="answer">Type your answer</label>
        <textarea
          id="answer"
          rows={4}
          value={typedAnswer}
          onChange={(e) => setTypedAnswer(e.target.value)}
          placeholder="Type here, or use the microphone below instead…"
          disabled={submitting}
        />

        <div className="voice-controls">
          {!isRecording ? (
            <button type="button" className="secondary-btn" onClick={startRecording} disabled={submitting}>
              🎤 Record voice answer
            </button>
          ) : (
            <button type="button" className="secondary-btn recording" onClick={stopRecording}>
              ⏹ Stop recording
            </button>
          )}
          {audioBlob && !isRecording && <span className="file-chip">Voice answer recorded ✓</span>}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-btn" onClick={handleSubmitAnswer} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}
