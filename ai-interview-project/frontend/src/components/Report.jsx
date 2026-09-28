import React, { useEffect, useState } from 'react';
import { getReport } from '../api.js';
import { getProctoringSummary } from '../services/proctoringApi.js';

export default function Report({ sessionId, onRestart }) {
  const [report, setReport] = useState(null);
  const [proctoringSummary, setProctoringSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [reportResult, summaryResult] = await Promise.allSettled([
          getReport(sessionId),
          getProctoringSummary(sessionId),
        ]);

        if (reportResult.status === 'fulfilled') {
          setReport(reportResult.value);
        } else {
          setError(reportResult.reason?.message || 'Could not load the report.');
        }

        if (summaryResult.status === 'fulfilled') {
          setProctoringSummary(summaryResult.value);
        }
      } catch (err) {
        setError(err.message || 'Could not load the report.');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="card">
        <h2>Generating your final report…</h2>
        <p className="hint">The AI is reviewing your full interview to produce a fair, detailed evaluation.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="error-text">{error}</p>
        <button className="secondary-btn" onClick={onRestart}>Start Over</button>
      </div>
    );
  }

  const skillScores = report.skill_scores || {};

  return (
    <div className="card">
      <h2>Interview Report</h2>

      <div className="overall-score">
        <span className="score-number">{report.overall_score}</span>
        <span className="score-label">Overall Score / 10</span>
      </div>

      <p className="recommendation-badge">{report.recommendation}</p>

      <h3>Skill Breakdown</h3>
      <ul className="score-list">
        {Object.entries(skillScores).map(([key, value]) => (
          <li key={key}>
            <span className="skill-name">{key.replace(/_/g, ' ')}</span>
            <span className="skill-score">{value}/10</span>
          </li>
        ))}
      </ul>

      <h3>Strengths</h3>
      <ul>
        {(report.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
      </ul>

      <h3>Areas to Improve</h3>
      <ul>
        {(report.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
      </ul>

      <h3>Feedback</h3>
      <p>{report.feedback_text}</p>

      {proctoringSummary && (
        <>
          <h3>Proctoring Summary</h3>
          {(proctoringSummary.status === 'TERMINATED' || proctoringSummary.proctoring_status === 'TERMINATED') && (
            <p className="malpractice-flag">
              🚫 Malpractice flag — this interview was auto-terminated for repeated proctoring violations.
            </p>
          )}
          <ul className="score-list">
            <li>
              <span className="skill-name">Proctoring status</span>
              <span className="skill-score">{proctoringSummary.status || 'COMPLETED'}</span>
            </li>
            <li>
              <span className="skill-name">Total violations</span>
              <span className="skill-score">{proctoringSummary.violation_count || 0} / {proctoringSummary.max_violations || 3}</span>
            </li>
            <li>
              <span className="skill-name">Tab switch events</span>
              <span className="skill-score">{proctoringSummary.tab_switch_events || 0}</span>
            </li>
            <li>
              <span className="skill-name">Window blur events</span>
              <span className="skill-score">{proctoringSummary.window_blur_events || 0}</span>
            </li>
            <li>
              <span className="skill-name">Fullscreen exits</span>
              <span className="skill-score">{proctoringSummary.fullscreen_exit_events || 0}</span>
            </li>
            <li>
              <span className="skill-name">Shortcut attempts blocked</span>
              <span className="skill-score">{proctoringSummary.shortcut_attempts || 0}</span>
            </li>
            <li>
              <span className="skill-name">Paste attempts blocked</span>
              <span className="skill-score">{proctoringSummary.paste_attempts || 0}</span>
            </li>
            <li>
              <span className="skill-name">Copy attempts blocked</span>
              <span className="skill-score">{proctoringSummary.copy_attempts || 0}</span>
            </li>
            <li>
              <span className="skill-name">No face detected events</span>
              <span className="skill-score">{proctoringSummary.no_face_events || 0}</span>
            </li>
            <li>
              <span className="skill-name">Multiple faces detected</span>
              <span className="skill-score">{proctoringSummary.multiple_face_events || 0}</span>
            </li>
          </ul>
        </>
      )}

      <button className="primary-btn" onClick={onRestart} style={{ marginTop: '1.5rem' }}>
        Start a New Interview
      </button>
    </div>
  );
}
