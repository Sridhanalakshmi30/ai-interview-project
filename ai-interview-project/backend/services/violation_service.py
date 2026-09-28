"""Violation policy service for processing security and proctoring events."""
import os
from typing import Dict, Any, Optional

DEFAULT_MAX_VIOLATIONS = int(os.getenv("PROCTOR_MAX_VIOLATIONS", "4"))

VIOLATION_EVENTS = {
    "TAB_SWITCH",
    "WINDOW_BLUR",
    "FULLSCREEN_EXIT",
    "SHORTCUT_BLOCKED",
    "PASTE_BLOCKED",
    "COPY_BLOCKED",
}


PAUSE_EVENTS = {
    "CAMERA_DISABLED",
    "MIC_DISABLED",
}


def evaluate_event(
    event_type: str,
    current_violation_count: int,
    max_violations: int,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Evaluates an incoming proctoring event and determines the appropriate severity,
    status change, action to take, and violation count.
    """
    event_type_upper = (event_type or "").strip().upper()

    if event_type_upper in {"NO_FACE_DETECTED", "MULTIPLE_FACES_DETECTED"}:
        return {
            "action": "INFO", "severity": "INFO", "new_status": "ACTIVE",
            "violation_increment": 0, "new_violation_count": current_violation_count,
            "paused_reason": None,
            "message": "Camera detection needs review; no violation has been counted.",
        }

    if event_type_upper in PAUSE_EVENTS:
        reason = "CAMERA_LOST" if event_type_upper == "CAMERA_DISABLED" else "MIC_LOST"
        if metadata and "reason" in metadata:
            reason = metadata["reason"]
        return {
            "action": "PAUSE",
            "severity": "PAUSE",
            "new_status": "PAUSED",
            "violation_increment": 0,
            "new_violation_count": current_violation_count,
            "paused_reason": reason,
            "message": f"Interview paused due to {event_type_upper}.",
        }

    if event_type_upper in VIOLATION_EVENTS:
        new_count = current_violation_count + 1
        if new_count >= max_violations:
            return {
                "action": "TERMINATE",
                "severity": "TERMINATE",
                "new_status": "TERMINATED",
                "violation_increment": 1,
                "new_violation_count": new_count,
                "paused_reason": None,
                "message": f"Interview terminated. Maximum violation threshold reached ({new_count}/{max_violations}).",
            }
        elif new_count == max_violations - 1:
            return {
                "action": "FINAL_WARN",
                "severity": "WARNING",
                "new_status": "WARNING",
                "violation_increment": 1,
                "new_violation_count": new_count,
                "paused_reason": None,
                "message": f"Final warning! Next violation will terminate your interview ({new_count}/{max_violations}).",
            }
        else:
            return {
                "action": "WARN",
                "severity": "WARNING",
                "new_status": "WARNING",
                "violation_increment": 1,
                "new_violation_count": new_count,
                "paused_reason": None,
                "message": f"Security warning: {event_type_upper} detected ({new_count}/{max_violations}).",
            }

    # Default / informational event
    return {
        "action": "INFO",
        "severity": "INFO",
        "new_status": "ACTIVE",
        "violation_increment": 0,
        "new_violation_count": current_violation_count,
        "paused_reason": None,
        "message": f"Event {event_type} recorded.",
    }
