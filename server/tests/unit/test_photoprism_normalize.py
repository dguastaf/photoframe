"""Unit tests for Photoprism-specific taken_at normalization."""

from __future__ import annotations

import pytest
from dateutil.tz import tzutc

from app.photo_source.photoprism_normalize import _time_zone_from_photoprism, taken_at_from_record


@pytest.mark.parametrize(
    "raw",
    [None, "", "   ", "not-a-zone"],
)
def test_time_zone_from_photoprism_falls_back_to_utc(raw: object) -> None:
    assert isinstance(_time_zone_from_photoprism(raw), tzutc)


def test_taken_at_from_record_is_timezone_aware() -> None:
    taken_at = taken_at_from_record(
        {"TakenAt": "2024-06-01T12:00:00Z", "TimeZone": "UTC-7"}
    )
    assert taken_at.tzinfo is not None


def test_taken_at_from_record_utc_minus_seven() -> None:
    assert taken_at_from_record(
        {
            "TakenAt": "2012-08-27T12:40:25Z",
            "TimeZone": "UTC-7",
        }
    ).isoformat() == "2012-08-27T05:40:25-07:00"


def test_taken_at_from_record_utc_plus_two() -> None:
    assert taken_at_from_record(
        {
            "TakenAt": "2024-06-01T12:00:00Z",
            "TimeZone": "UTC+2",
        }
    ).isoformat() == "2024-06-01T14:00:00+02:00"


def test_taken_at_from_record_missing_time_zone_defaults_to_utc() -> None:
    assert taken_at_from_record({"TakenAt": "2024-06-01T12:00:00Z"}).isoformat() == "2024-06-01T12:00:00+00:00"


def test_taken_at_from_record_utc_plus_zero() -> None:
    assert taken_at_from_record(
        {
            "TakenAt": "2024-06-01T12:00:00Z",
            "TimeZone": "UTC+0",
        }
    ).isoformat() == "2024-06-01T12:00:00+00:00"
