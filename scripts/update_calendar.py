#!/usr/bin/env python3
"""Monitor official sources and rebuild the public ICS calendar.

The script deliberately does not invent or infer deadlines. It only exports exact
ISO dates already stored in deadlines.json. When an official source changes, it
writes needs_review.json and changes_summary.md for human verification.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCES_FILE = ROOT / "monitoring_sources.json"
STATUS_FILE = ROOT / "source_status.json"
REVIEW_FILE = ROOT / "needs_review.json"
SUMMARY_FILE = ROOT / "changes_summary.md"
DEADLINES_FILE = ROOT / "deadlines.json"
ICS_FILE = ROOT / "kino-finance-deadlines.ics"
USER_AGENT = "kino-finance-russia-monitor/1.0 (+https://github.com/naztutnet/kino-finance-russia)"


def read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_html(data: bytes) -> bytes:
    text = data.decode("utf-8", errors="replace")
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.I | re.S)
    text = re.sub(r"<style\b[^>]*>.*?</style>", "", text, flags=re.I | re.S)
    text = re.sub(r"\s+", " ", text).strip()
    return text.encode("utf-8")


def fetch_fingerprint(url: str) -> tuple[str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,*/*"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read(3_000_000)
            status = f"http-{getattr(response, 'status', 200)}"
    except urllib.error.HTTPError as exc:
        return f"http-{exc.code}", ""
    except Exception as exc:  # network and TLS errors are recorded, not fatal
        return f"error-{type(exc).__name__}", ""
    return status, hashlib.sha256(normalize_html(body)).hexdigest()


def monitor_sources() -> list[dict[str, Any]]:
    sources = read_json(SOURCES_FILE, [])
    previous = read_json(STATUS_FILE, {})
    current: dict[str, Any] = dict(previous)
    changed: list[dict[str, Any]] = []

    for source in sources:
        source_id = str(source.get("id") or source.get("name") or source.get("url"))
        url = str(source.get("url", ""))
        if not url:
            continue
        status, fingerprint = fetch_fingerprint(url)
        old = previous.get(source_id, {})
        new_record = {
            "name": source.get("name", source_id),
            "url": url,
            "status": status,
            "fingerprint": fingerprint,
        }
        if old.get("fingerprint") and fingerprint and old.get("fingerprint") != fingerprint:
            changed.append(new_record)
        if old != new_record:
            current[source_id] = new_record

    if current != previous:
        write_json(STATUS_FILE, current)

    if changed:
        timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        payload = {"detected_at": timestamp, "sources": changed}
        write_json(REVIEW_FILE, payload)
        lines = ["# Требуется проверка источников", "", f"Изменения обнаружены: {timestamp}", ""]
        for item in changed:
            lines.append(f"- [{item['name']}]({item['url']})")
        lines.extend(["", "Проверьте новые объявления, сроки подачи и опубликованные результаты.", ""])
        SUMMARY_FILE.write_text("\n".join(lines), encoding="utf-8")
    return changed


def escape_ics(value: Any) -> str:
    return str(value or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def parse_iso_day(value: Any) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def normalize_deadlines(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, list):
        return [x for x in raw if isinstance(x, dict)]
    if isinstance(raw, dict):
        for key in ("deadlines", "events"):
            if isinstance(raw.get(key), list):
                return [x for x in raw[key] if isinstance(x, dict)]
    return []


def build_ics() -> int:
    events = normalize_deadlines(read_json(DEADLINES_FILE, []))
    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//naztutnet//Kino Finance Russia//RU",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Финансирование кино РФ — дедлайны",
        "X-WR-TIMEZONE:Europe/Moscow",
    ]
    exported = 0
    for index, event in enumerate(events):
        day = parse_iso_day(event.get("date_iso") or event.get("deadline_iso") or event.get("start_date"))
        if day is None:
            continue
        title = event.get("title") or event.get("program") or "Дедлайн финансирования кино"
        organizer = event.get("organizer") or event.get("fund") or ""
        description = event.get("note") or event.get("description") or ""
        url = event.get("source_url") or event.get("source") or event.get("application_url") or event.get("apply") or ""
        uid_seed = f"{day.isoformat()}|{organizer}|{title}|{index}"
        uid = hashlib.sha1(uid_seed.encode("utf-8")).hexdigest() + "@kino-finance-russia"
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{now_stamp}",
            f"DTSTART;VALUE=DATE:{day.strftime('%Y%m%d')}",
            f"DTEND;VALUE=DATE:{(day + timedelta(days=1)).strftime('%Y%m%d')}",
            f"SUMMARY:{escape_ics(organizer + ' — ' + title if organizer else title)}",
            f"DESCRIPTION:{escape_ics(description)}",
        ])
        if url:
            lines.append(f"URL:{escape_ics(url)}")
        lines.append("END:VEVENT")
        exported += 1
    lines.append("END:VCALENDAR")
    output = "\r\n".join(lines) + "\r\n"
    if not ICS_FILE.exists() or ICS_FILE.read_text(encoding="utf-8") != output:
        ICS_FILE.write_text(output, encoding="utf-8", newline="")
    return exported


def main() -> int:
    changed = monitor_sources()
    exported = build_ics()
    print(json.dumps({"changed_sources": len(changed), "ics_events": exported}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
