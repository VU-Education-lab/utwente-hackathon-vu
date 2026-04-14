#!/usr/bin/env python3
"""
Focused baseline test for SpeakEasy tutor prompt.

Flow:
1. Load one fixed dummy scenario from JSON
2. Send it to tutor prompt
3. Validate required output structure
4. Print scenario, tutor output, and validation result
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib import error, request


ROOT = Path(__file__).resolve().parent
TUTOR_PROMPT_PATH = ROOT / "tutor_prompt.txt"
ENV_PATH = ROOT / ".env"
DUMMY_SCENARIO_PATH = ROOT / "dummy_scenario_baseline.json"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def load_dummy_scenario(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise RuntimeError(f"Dummy scenario file not found: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON in {path}: {exc}") from exc


def azure_chat(messages: list[dict[str, str]], temperature: float = 0.3) -> str:
    endpoint = required_env("AZURE_OPENAI_ENDPOINT").rstrip("/")
    deployment = required_env("AZURE_OPENAI_CHAT_DEPLOYMENT")
    api_version = required_env("AZURE_OPENAI_API_VERSION")
    api_key = required_env("AZURE_OPENAI_API_KEY")

    url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
    payload = {"messages": messages, "temperature": temperature}
    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "api-key": api_key},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Azure API error {exc.code}: {details}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Network error calling Azure OpenAI: {exc}") from exc

    try:
        return body["choices"][0]["message"]["content"]
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Unexpected Azure response shape: {body}") from exc


def parse_json_loose(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        cleaned = text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return {"raw_text": text}


def tutor_feedback(context: dict[str, Any]) -> dict[str, Any]:
    tutor_system = TUTOR_PROMPT_PATH.read_text(encoding="utf-8")
    user_msg = {
        "instruction": (
            "Analyze this conversation and return JSON with keys: "
            "what_went_well, improve_next_time, try_this_instead, "
            "highlighted_moments, retry_prompt, metadata_for_ui."
        ),
        "input": context,
    }
    raw = azure_chat(
        [
            {"role": "system", "content": tutor_system},
            {"role": "user", "content": json.dumps(user_msg, ensure_ascii=True)},
        ],
        temperature=0.3,
    )
    return parse_json_loose(raw)


def validate_feedback(feedback: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    required_top = [
        "what_went_well",
        "improve_next_time",
        "try_this_instead",
        "retry_prompt",
        "metadata_for_ui",
    ]
    for key in required_top:
        if key not in feedback:
            issues.append(f"missing key: {key}")

    rewrite = feedback.get("try_this_instead")
    if isinstance(rewrite, dict):
        for key in ["instead_of", "try", "why_it_works"]:
            if key not in rewrite:
                issues.append(f"missing try_this_instead.{key}")
    else:
        issues.append("try_this_instead should be an object")

    metadata = feedback.get("metadata_for_ui")
    if isinstance(metadata, dict):
        for key in ["top_skill_target", "recommended_retry_mode", "coaching_intensity_used"]:
            if key not in metadata:
                issues.append(f"missing metadata_for_ui.{key}")
    else:
        issues.append("metadata_for_ui should be an object")
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Run one baseline tutor test with a fixed dummy scenario.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print loaded scenario only; do not call Azure.",
    )
    args = parser.parse_args()

    load_env_file(ENV_PATH)
    context = load_dummy_scenario(DUMMY_SCENARIO_PATH)

    if args.dry_run:
        print("=== Baseline Tutor Test (DRY RUN) ===")
        print(json.dumps(context, indent=2, ensure_ascii=True))
        return 0

    feedback = tutor_feedback(context)
    issues = validate_feedback(feedback)

    print("=== Baseline Scenario ===")
    print(json.dumps(context, indent=2, ensure_ascii=True))
    print("\n=== Tutor Feedback ===")
    print(json.dumps(feedback, indent=2, ensure_ascii=True))
    print("\n=== Feedback Validation ===")
    if issues:
        print(json.dumps({"status": "needs_fix", "issues": issues}, indent=2, ensure_ascii=True))
    else:
        print(json.dumps({"status": "ok", "issues": []}, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
