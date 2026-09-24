import React, { useEffect, useState } from 'react';
import { getReport } from '../api.js';

export default function Report({ sessionId, onRestart }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const result = await getReport(sessionId);
        setReport(result);
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

      <button className="primary-btn" onClick={onRestart} style={{ marginTop: '1.5rem' }}>
        Start a New Interview
      </button>
    </div>
  );
}
