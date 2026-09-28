import React from 'react';

const LABELS = {

  ACTIVE: {
    text: '● Proctoring active',
    cls: 'proctor-badge active',
  },

  WARNING: {
    text: '● Proctoring warning',
    cls: 'proctor-badge warning',
  },

  PAUSED: {
    text: '● Interview paused',
    cls: 'proctor-badge paused',
  },

  TERMINATED: {
    text: '● Interview terminated',
    cls: 'proctor-badge terminated',
  },

  CHECKING: {
    text: '● Checking devices…',
    cls: 'proctor-badge checking',
  },

};

export default function ProctoringStatusBadge({
  phase,
  violationCount,
  maxViolations,
}) {

  const info = LABELS[phase];

  if (!info) {
    return null;
  }

  return (
    <span
      className={info.cls}
      title={`Violations: ${violationCount}/${maxViolations}`}
    >
      {info.text}
    </span>
  );
}
