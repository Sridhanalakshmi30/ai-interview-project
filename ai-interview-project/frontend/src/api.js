// Small fetch wrapper for all backend calls. The Vite dev server proxies /api to the backend.

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || (typeof data.detail === 'string' && data.detail) || `Request failed with status ${res.status}`);
  }
  return data;
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append('resume', file);
  const res = await fetch('/api/resume/upload', { method: 'POST', body: formData });
  return handleResponse(res);
}

export async function giveConsent(candidateId) {
  const res = await fetch('/api/interview/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId }),
  });
  return handleResponse(res);
}

export async function startInterview(candidateId, durationMinutes) {
  const res = await fetch('/api/interview/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, durationMinutes })
  });
  return handleResponse(res);
}

export async function submitAnswer(sessionId, turnId, { answerText, audioBlob }) {
  const formData = new FormData();
  formData.append('turnId', turnId);
  if (answerText) formData.append('answerText', answerText);
  if (audioBlob) formData.append('audio', audioBlob, 'answer.webm');

  const res = await fetch(`/api/interview/${sessionId}/answer`, { method: 'POST', body: formData });
  return handleResponse(res);
}

export async function requestNextQuestion(sessionId) {
  const res = await fetch(
    `/api/interview/${sessionId}/next-question`,
    {
      method: 'POST',
    }
  );
  return handleResponse(res);
}

export async function getReport(sessionId) {
  const res = await fetch(`/api/interview/${sessionId}/report`);
  return handleResponse(res);
}
