"""Shared KPI status calculation (backend)."""

from __future__ import annotations


def calculate_kpi_status(
    value: float | None,
    target: float,
    warning_threshold: float,
    critical_threshold: float,
    direction: str,
    target_min: float | None = None,
    target_max: float | None = None,
) -> str:
    if value is None:
        return "No Data"

    if direction == "Higher Is Better":
        if value >= target:
            return "On Target"
        if value >= warning_threshold:
            return "Warning"
        return "Critical"

    if direction == "Lower Is Better":
        if value <= target:
            return "On Target"
        if value <= warning_threshold:
            return "Warning"
        return "Critical"

    # Target Range
    low = target_min if target_min is not None else min(target, warning_threshold)
    high = target_max if target_max is not None else max(target, warning_threshold)
    if low <= value <= high:
        return "On Target"
    span = max(high - low, 1.0)
    band = span * 0.25
    if low - band <= value <= high + band:
        return "Warning"
    _ = critical_threshold
    return "Critical"


def validate_kpi_thresholds(
    direction: str,
    target: float,
    warning_threshold: float,
    critical_threshold: float,
    target_min: float | None = None,
    target_max: float | None = None,
) -> str | None:
    if direction == "Higher Is Better":
        if not (critical_threshold <= warning_threshold <= target):
            return "For Higher Is Better: Critical ≤ Warning ≤ Target."
    elif direction == "Lower Is Better":
        if not (target <= warning_threshold <= critical_threshold):
            return "For Lower Is Better: Target ≤ Warning ≤ Critical."
    else:
        low = target_min if target_min is not None else min(target, warning_threshold)
        high = target_max if target_max is not None else max(target, warning_threshold)
        if low > high:
            return "For Target Range: minimum must be less than or equal to maximum."
    return None
