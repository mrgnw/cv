#!/usr/bin/env python3
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "json5",
# ]
# ///
"""Convert a version JSON5 file into JSON Resume schema (still JSON5 output)."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import json5  # type: ignore
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a version JSON5 file into JSON Resume format"
    )
    parser.add_argument("input", type=Path, help="Path to the source JSON5 file")
    parser.add_argument(
        "output",
        nargs="?",
        type=Path,
        help="Destination JSON5 file (defaults to stdout)",
    )
    parser.add_argument(
        "--schema-url",
        default="https://jsonresume.org/schema",
        help="Schema reference comment to include in the output",
    )
    parser.add_argument(
        "--merge",
        type=Path,
        help="Optional JSON5 file with defaults to merge into the input before converting",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit strict JSON instead of JSON5 (omits header comments)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_data: dict[str, Any] = {}
    if args.merge:
        base_data = json5.load(args.merge.open("r", encoding="utf-8"))

    version_data = json5.load(args.input.open("r", encoding="utf-8"))
    merged = deep_merge(base_data, version_data)
    resume = to_json_resume(merged)

    if args.json:
        payload = json.dumps(resume, indent=2)
        output = f"{payload}\n"
    else:
        payload = json5.dumps(resume, indent=2, trailing_commas=False)
        header = _header_comment(args.schema_url, args.input)
        output = f"{header}\n{payload}\n"

    if args.output:
        args.output.write_text(output, encoding="utf-8")
    else:
        print(output, end="")


def to_json_resume(source: dict[str, Any]) -> dict[str, Any]:
    basics = build_basics(source)
    work = build_work(source)
    skills = build_skills(source)
    projects = build_projects(source)
    education = build_education(source)
    interests = build_interests(source)
    meta = build_meta(source)

    resume: dict[str, Any] = {
        "basics": basics,
        "work": work,
        "skills": skills,
        "projects": projects,
        "education": education,
    }

    if interests:
        resume["interests"] = interests
    if meta:
        resume["meta"] = meta

    return resume


def build_basics(source: dict[str, Any]) -> dict[str, Any]:
    basics: dict[str, Any] = {"name": source.get("name", "Unknown")}
    if title := source.get("title"):
        basics["label"] = title
    if email := source.get("email"):
        basics["email"] = email
    if url := _clean_string(source.get("portfolio")):
        basics["url"] = url
    profiles: list[dict[str, Any]] = []
    for entry in _iter_dicts(source.get("profiles")):
        cleaned: dict[str, Any] = {}
        for key, value in entry.items():
            cleaned_value = _clean_string(value)
            if cleaned_value is None:
                continue
            cleaned[key] = cleaned_value
        if "url" in cleaned and not _is_valid_uri(cleaned["url"]):
            cleaned.pop("url")
        if cleaned:
            profiles.append(cleaned)

    if github := _clean_string(source.get("github")):
        username = github.rstrip("/").split("/")[-1]
        gh_url = github if _is_valid_uri(github) else None
        gh_profile = {
            "network": "GitHub",
            "username": username,
        }
        if gh_url:
            gh_profile["url"] = gh_url
        if not any(_same_profile(p, gh_profile) for p in profiles):
            profiles.append(gh_profile)

    if profiles:
        basics["profiles"] = profiles
    return basics


def build_work(source: dict[str, Any]) -> list[dict[str, Any]]:
    work_entries = []
    for job in _iter_dicts(source.get("experience")):
        start_date = job.get("start")
        end_date = job.get("end")
        if end_date is None:
            end_date = _today_iso()
        entry: dict[str, Any] = {
            "name": job.get("company"),
            "position": job.get("title"),
            "startDate": start_date,
            "endDate": end_date,
            "highlights": job.get("achievements", []),
        }
        skills = job.get("skills")
        if isinstance(skills, list) and skills:
            entry["keywords"] = skills
        work_entries.append(entry)
    return work_entries


def build_skills(source: dict[str, Any]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    if (core := _ensure_list(source.get("skills"))):
        blocks.append({"name": "Core", "keywords": core})
    if (secondary := _ensure_list(source.get("secondarySkills"))):
        blocks.append({"name": "Secondary", "keywords": secondary})
    return blocks


def build_projects(source: dict[str, Any]) -> list[dict[str, Any]]:
    projects: list[dict[str, Any]] = []
    for item in source.get("projects", []) or []:
        if isinstance(item, str):
            projects.append({"name": item})
            continue
        if isinstance(item, dict):
            entry: dict[str, Any] = {}
            if name := item.get("name"):
                entry["name"] = name
            if description := item.get("description"):
                entry["description"] = description
            if url := item.get("url"):
                entry["url"] = url
            if skills := _ensure_list(item.get("skills")):
                entry["keywords"] = skills
            projects.append(entry)
    return projects


def build_education(source: dict[str, Any]) -> list[dict[str, Any]]:
    education = []
    for item in _iter_dicts(source.get("education")):
        entry: dict[str, Any] = {
            "institution": item.get("provider"),
            "studyType": item.get("degree"),
            "area": item.get("summary"),
        }
        if year := item.get("year"):
            entry["endDate"] = _normalize_year(year)
        education.append(entry)
    return education


def build_interests(source: dict[str, Any]) -> list[dict[str, Any]]:
    keywords = _ensure_list(source.get("keywords"))
    return [{"name": "Keywords", "keywords": keywords}] if keywords else []


def build_meta(source: dict[str, Any]) -> dict[str, Any]:
    meta: dict[str, Any] = {}
    if "matchScore" in source:
        meta["matchScore"] = source["matchScore"]
    if "matchFactors" in source:
        meta["matchFactors"] = source["matchFactors"]
    return meta


def deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key in base.keys() | overlay.keys():
        left = base.get(key)
        right = overlay.get(key)
        if isinstance(left, dict) and isinstance(right, dict):
            result[key] = deep_merge(left, right)
        elif right is not None:
            result[key] = right
        else:
            result[key] = left
    return result


def _clean_string(value: Any) -> Any:
    if isinstance(value, str):
        trimmed = value.strip()
        return trimmed or None
    return value


def _same_profile(left: dict[str, Any], right: dict[str, Any]) -> bool:
    left_network = str(left.get("network", "")).lower()
    right_network = str(right.get("network", "")).lower()
    if left_network and right_network and left_network == right_network:
        return True

    left_url = _clean_string(left.get("url"))
    right_url = _clean_string(right.get("url"))
    if left_url and right_url:
        return left_url.rstrip("/") == right_url.rstrip("/")

    return False


def _is_valid_uri(value: str) -> bool:
    parsed = urlparse(value)
    return bool(parsed.scheme and parsed.netloc)


def _iter_dicts(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                yield item


def _ensure_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _normalize_year(value: Any) -> str | None:
    text = str(value).strip()
    if not text:
        return None
    return f"{text}-01-01" if text.isdigit() and len(text) == 4 else text


def _header_comment(schema_url: str, input_path: Path) -> str:
    timestamp = dt.datetime.now(dt.timezone.utc).isoformat()
    relative = input_path.resolve()
    return "\n".join(
        [
            f"// JSON Resume schema: {schema_url}",
            f"// Source: {relative}",
            f"// Generated: {timestamp}",
        ]
    )


def _today_iso() -> str:
    return dt.date.today().isoformat()


if __name__ == "__main__":
    main()
