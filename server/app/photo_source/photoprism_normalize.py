"""Photoprism-specific normalization for capture time.

The frame overlay should show the date and local time *as they were at capture*, 
not the same instant re-labeled in the viewer's local timezone. 

Photoprism returns two fields we must combine:

- ``TakenAt``: an ISO timestamp for the moment the shutter fired, stored as a UTC
  instant (often with a ``Z`` suffix).
- ``TimeZone``: a *numeric offset label* such as ``UTC-7`` or ``UTC+2``

We therefore parse ``TakenAt`` as UTC, apply Photoprism's offset (e.g. ``UTC-7``),
and return a timezone-aware ``datetime`` for client display.
"""

from __future__ import annotations

from datetime import UTC, datetime

from dateutil.parser import isoparse
from dateutil.tz import tzstr, tzutc

# Photoprism ``TimeZone`` values are conventional offsets (``UTC-7``, ``UTC+0``), not POSIX
# TZ strings and not IANA names. dateutil's default (posix_offset=False) matches that.
_PHOTOPRISM_POSIX_OFFSET = False


def taken_at_from_record(record: dict) -> datetime:
    instant = isoparse(str(record["TakenAt"])).astimezone(UTC)
    capture_tz = _time_zone_from_photoprism(record.get("TimeZone"))
    return instant.astimezone(capture_tz)


def _time_zone_from_photoprism(raw: object) -> tzutc | tzstr:
    if raw is None:
        return tzutc()
    text = str(raw).strip()
    if not text:
        return tzutc()
    try:
        return tzstr(text, posix_offset=_PHOTOPRISM_POSIX_OFFSET)
    except (TypeError, ValueError):
        return tzutc()
