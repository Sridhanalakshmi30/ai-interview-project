"""Pydantic schemas for proctoring endpoints."""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from services.violation_service import DEFAULT_MAX_VIOLATIONS


class StartProctoringRequest(BaseModel):
    session_id: int
    max_violations: Optional[int] = DEFAULT_MAX_VIOLATIONS


class ProctoringEventRequest(BaseModel):
    session_id: int
    event_type: str
    question_number: Optional[int] = None
    client_timestamp: Optional[str] = None
    duration_seconds: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class ProctoringStatusResponse(BaseModel):
    session_id: int
    status: str
    violation_count: int
    max_violations: int
    paused_reason: Optional[str] = None


class ProctoringEventResponse(BaseModel):
    success: bool
    action: str  # 'INFO', 'WARN', 'FINAL_WARN', 'PAUSE', 'TERMINATE'
    violation_count: int
    max_violations: int
    message: Optional[str] = None


class ProctoringSummaryResponse(BaseModel):
    session_id: int
    status: str
    violation_count: int
    max_violations: int
    total_events: int
    events: List[Dict[str, Any]]
