#!/usr/bin/env python3
"""SpeakEasy Coach backend — serves mockup.html and wires it to Azure OpenAI."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parent
TUTOR_PROMPT_PATH = ROOT / "tutor_prompt.txt"
ENV_PATH = ROOT / ".env"
MOCKUP_PATH = ROOT / "mockup.html"
PROMPTS_DIR = ROOT / "prompts"
FINAL_SCENARIOS_DIR = ROOT / "final_scenarios"

OPENAI_REALTIME_MODEL = "gpt-4o-realtime-preview-2024-12-17"
OPENAI_REALTIME_SESSIONS_URL = "https://api.openai.com/v1/realtime/sessions"

GENERIC_PARTNER_PROMPT = (
    "You are a simulated conversation partner in a communication practice app. "
    "Stay in scenario and respond naturally based on partner personality and scenario context."
)

PARTNER_FORMAT_RULES = (
    "\n\nFormat rules:\n"
    "- Reply in 1-3 sentences.\n"
    "- Stay fully in character. Never break the scene.\n"
    "- Do not coach, evaluate, or comment on the user's communication.\n"
    "- Do not prefix your reply with 'Partner:' or any speaker label.\n"
    "- Do not wrap your reply in quotes."
)

PARTNER_VOICE_FORMAT_RULES = (
    "\n\nVoice conversation rules:\n"
    "- This conversation is happening over a phone call. The user hears you speak.\n"
    "- Reply in 1-3 short, natural spoken sentences. Avoid lists or bullet points.\n"
    "- Use natural disfluencies sparingly when realistic (small pauses, 'uhm', 'nou', 'eh').\n"
    "- Stay fully in character. Never break the scene.\n"
    "- Do not coach, evaluate, or comment on the user's communication.\n"
    "- Do not narrate actions or stage directions."
)


def _read_scenario_file(filename: str) -> str | None:
    """Look up a prompt file in final_scenarios/ first, then prompts/."""
    for directory in (FINAL_SCENARIOS_DIR, PROMPTS_DIR):
        path = directory / filename
        if path.exists():
            return path.read_text(encoding="utf-8").strip()
    return None


def load_partner_system_prompt(scenario: dict[str, Any]) -> str:
    base = _read_scenario_file(f"partner_{scenario['id']}.txt") or GENERIC_PARTNER_PROMPT
    return base + PARTNER_FORMAT_RULES


def load_partner_voice_prompt(
    scenario: dict[str, Any],
    prior_messages: list["ChatMessage"] | None = None,
    replay_partner_line: str | None = None,
) -> str:
    """Voice-mode partner prompt.

    Base form: scenario brief + voice format rules + language + opening line.

    Retry form (when prior_messages + replay_partner_line are given): the same
    base prompt PLUS the prior conversation transcript and an instruction to
    resume mid-call by repeating the partner's last line verbatim.
    """
    base = _read_scenario_file(f"partner_{scenario['id']}.txt") or GENERIC_PARTNER_PROMPT
    parts = [base, PARTNER_VOICE_FORMAT_RULES]
    language = scenario.get("language")
    if language == "nl":
        parts.append(
            "\n\nLanguage: Speak Dutch (Nederlands) throughout. The user will speak Dutch."
        )
    elif language == "en":
        parts.append("\n\nLanguage: Speak English throughout.")

    if prior_messages and replay_partner_line:
        # Retry path: this is a resumed call. Bake in the prior conversation
        # as context and have the AI replay its last line so the user can
        # respond again from that exact moment.
        history_lines: list[str] = []
        for m in prior_messages:
            text = (m.text or "").strip()
            if not text or text == "…":
                continue
            speaker = "Student" if m.role == "user" else "You"
            history_lines.append(f"{speaker}: {text}")
        history_block = "\n".join(history_lines)
        parts.append(
            "\n\nThis call is RESUMING mid-conversation. The student already had "
            "an attempt that they want to retry from a specific moment. Below is "
            "the conversation up to that point — it has already happened, do NOT "
            "rephrase or recap it.\n\n"
            f"Prior conversation:\n{history_block}\n\n"
            f"Begin this resumed call by saying exactly your last line again, "
            f"verbatim, in the same warm-but-busy tone: \"{replay_partner_line}\"\n"
            f"Then wait for the student's reply and continue naturally from there."
        )
    else:
        opening = scenario.get("partner_opening")
        if opening:
            parts.append(
                f"\n\nBegin the call by saying exactly this opening line, then continue "
                f"naturally based on what the user says: \"{opening}\""
            )
    return "".join(parts)


def load_scenario_criteria(scenario: dict[str, Any]) -> str | None:
    return _read_scenario_file(f"tutor_{scenario['id']}.txt")


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


SCENARIO_CATALOG: list[dict[str, Any]] = [
    {
        "id": "reference_short_notice",
        "title": "Vraag Een Referentie Op Korte Termijn",
        "category": "assertiveness-boundary",
        "category_label": "Assertiveness & Boundary",
        "difficulty": "intermediate",
        "skills": ["assertiveness", "clarity", "boundary-setting"],
        "focus_text": "Focus: blijf staan in je vraag, ook als het ongemakkelijk wordt.",
        "role": "Je belt Marleen, je oud-stagebegeleider, om een aanbevelingsbrief te vragen op korte termijn.",
        "goal": "Stel je vraag duidelijk en blijf erin staan, ook als Marleen aarzelt of het druk heeft.",
        "objective_type": "assertiveness",
        "partner_personality": "warm but busy",
        "tier": "core",
        "pill": "Voice Demo",
        "partner_opening": "Hallo, met Marleen.",
        "voice_enabled": True,
        "voice": "shimmer",
        "language": "nl",
    },
    {
        "id": "join_group",
        "title": "Join A Group Conversation",
        "category": "social-micro",
        "category_label": "Social Micro",
        "difficulty": "beginner",
        "skills": ["opening-lines", "active-listening", "engagement"],
        "focus_text": "Focus: opening lines and smooth entry.",
        "role": "You are joining a small group chat after class.",
        "goal": "Practice entering an ongoing conversation naturally.",
        "objective_type": "practice_basics",
        "partner_personality": "friendly",
        "tier": "core",
        "pill": "Small Talk",
        "partner_opening": "...and I'm telling you, that homework took me like four hours. Oh — hey, what's up?",
    },
    {
        "id": "clarify_repeat",
        "title": "Ask Someone To Repeat Clearly",
        "category": "social-micro",
        "category_label": "Social Micro",
        "difficulty": "beginner",
        "skills": ["active-listening", "clarity", "engagement"],
        "focus_text": "Focus: clarification without awkwardness.",
        "role": "You are talking to cafe staff and need clarification.",
        "goal": "Practice asking for repetition politely and clearly.",
        "objective_type": "practice_basics",
        "partner_personality": "neutral",
        "tier": "extended",
        "pill": "Everyday",
        "partner_opening": "Hey there, what can I — hold on one sec — yeah, what can I get started for you?",
    },
    {
        "id": "ask_professor_help",
        "title": "Ask A Professor For Help",
        "category": "assertiveness-boundary",
        "category_label": "Assertiveness & Boundary",
        "difficulty": "beginner",
        "skills": ["assertiveness", "clarity", "confidence-signals"],
        "focus_text": "Focus: clear requests with confident tone.",
        "role": "You are a student asking a professor for support on question 3.",
        "goal": "Practice making a direct, respectful request for clarification.",
        "objective_type": "assertiveness",
        "partner_personality": "friendly",
        "tier": "core",
        "pill": "Assertiveness",
        "partner_opening": "Come on in, take a seat. What can I help you with? I have about ten minutes before my next student.",
    },
    {
        "id": "say_no_politely",
        "title": "Say No Politely",
        "category": "assertiveness-boundary",
        "category_label": "Assertiveness & Boundary",
        "difficulty": "intermediate",
        "skills": ["assertiveness", "clarity", "boundary-setting"],
        "focus_text": "Focus: direct but respectful refusal.",
        "role": "A friend asks for a favor you cannot do.",
        "goal": "Practice saying no while keeping tone warm and clear.",
        "objective_type": "assertiveness",
        "partner_personality": "neutral",
        "tier": "core",
        "pill": "Boundaries",
        "partner_opening": "Hey! So glad I caught you. Listen, I need a huge favor — can you cover my shift Saturday night? I know it's super last minute.",
    },
    {
        "id": "internship_interview",
        "title": "Internship Interview",
        "category": "professional-performance",
        "category_label": "Professional & Performance",
        "difficulty": "advanced",
        "skills": ["confidence-signals", "clarity", "structured-answering"],
        "focus_text": "Focus: concise, calm, and structured answers.",
        "role": "You are interviewing for an internship role.",
        "goal": "Practice answering high-stakes questions with structure and calm.",
        "objective_type": "performance",
        "partner_personality": "neutral",
        "tier": "core",
        "pill": "High Stakes",
        "partner_opening": "Thanks for coming in today. Let's start simple — tell me a bit about yourself and why you applied for this role.",
    },
    {
        "id": "pitch_meeting",
        "title": "Pitch An Idea In A Meeting",
        "category": "professional-performance",
        "category_label": "Professional & Performance",
        "difficulty": "intermediate",
        "skills": ["clarity", "confidence-signals", "handling-pressure"],
        "focus_text": "Focus: organize thoughts under pressure.",
        "role": "You are presenting your idea in a meeting.",
        "goal": "Practice concise pitching and handling follow-up questions.",
        "objective_type": "performance",
        "partner_personality": "slightly impatient",
        "tier": "extended",
        "pill": "Presentation",
        "partner_opening": "Okay, you've got the floor. What's the idea? I've got about ten minutes before my next thing.",
    },
    {
        "id": "awkward_silence",
        "title": "Handle Awkward Silence",
        "category": "ambiguity-recovery",
        "category_label": "Ambiguity & Recovery",
        "difficulty": "intermediate",
        "skills": ["recovery", "emotional-regulation", "engagement"],
        "focus_text": "Focus: stay calm and keep conversation going.",
        "role": "The other person gives vague, short responses.",
        "goal": "Practice recovering and continuing under ambiguity.",
        "objective_type": "ambiguity_recovery",
        "partner_personality": "reserved",
        "tier": "extended",
        "pill": "Ambiguity",
        "partner_opening": "Oh... hey.",
    },
    {
        "id": "recover_awkward",
        "title": "Recover After An Awkward Moment",
        "category": "ambiguity-recovery",
        "category_label": "Ambiguity & Recovery",
        "difficulty": "intermediate",
        "skills": ["recovery", "confidence-signals", "clarity"],
        "focus_text": "Focus: reset tone without overexplaining.",
        "role": "You said something awkward and want to recover smoothly.",
        "goal": "Practice graceful recovery and conversation continuation.",
        "objective_type": "ambiguity_recovery",
        "partner_personality": "neutral",
        "tier": "extended",
        "pill": "Recovery",
        "partner_opening": "...Wow. Okay. I'm — I'm honestly not really sure what to say to that.",
    },
    {
        "id": "misunderstanding",
        "title": "Address A Misunderstanding",
        "category": "professional-conflict",
        "category_label": "Professional Conflict-Lite",
        "difficulty": "intermediate",
        "skills": ["clarity", "assertiveness", "active-listening"],
        "focus_text": "Focus: calm clarification without escalation.",
        "role": "A teammate misunderstood your message; you need to clarify.",
        "goal": "Practice respectful clarification in low-intensity conflict.",
        "objective_type": "conflict_lite",
        "partner_personality": "neutral",
        "tier": "extended",
        "pill": "Conflict-Lite",
        "partner_opening": "Hey. I got your message earlier. Honestly, I'm not really sure what you wanted me to do differently — I did it the way we talked about.",
    },
    {
        "id": "mild_criticism",
        "title": "Respond To Mild Criticism",
        "category": "professional-conflict",
        "category_label": "Professional Conflict-Lite",
        "difficulty": "intermediate",
        "skills": ["active-listening", "assertiveness", "clarity"],
        "focus_text": "Focus: receive feedback while staying grounded.",
        "role": "You received mild criticism in a project check-in.",
        "goal": "Practice grounded, non-defensive response to criticism.",
        "objective_type": "conflict_lite",
        "partner_personality": "slightly impatient",
        "tier": "extended",
        "pill": "Feedback",
        "partner_opening": "Thanks for hopping on. So — I wanted to talk about the report you sent yesterday. There are a few things I think we should look at.",
    },
]

SCENARIOS_BY_ID: dict[str, dict[str, Any]] = {s["id"]: s for s in SCENARIO_CATALOG}


def get_scenario(scenario_id: str) -> dict[str, Any]:
    scenario = SCENARIOS_BY_ID.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Unknown scenario_id: {scenario_id}")
    return scenario


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'partner'")
    text: str


class PartnerReplyRequest(BaseModel):
    scenario_id: str
    partner_personality: str | None = None
    messages: list[ChatMessage]


class PartnerReplyResponse(BaseModel):
    reply: str


class FeedbackRequest(BaseModel):
    scenario_id: str
    partner_personality: str | None = None
    difficulty: str | None = None
    retry_mode: str = "first_attempt"
    selected_retry_moment: str | None = None
    messages: list[ChatMessage]


class LiveScoreRequest(BaseModel):
    scenario_id: str
    messages: list[ChatMessage]


class LiveScoreResponse(BaseModel):
    score: float


def compute_live_score(scenario: dict[str, Any], messages: list[ChatMessage]) -> float:
    # Filter out empty/placeholder turns and cap to last ~12 exchanges so the
    # prompt stays small and the call stays cheap.
    lines: list[str] = []
    for m in messages[-12:]:
        text = (m.text or "").strip()
        if not text or text == "…":
            continue
        speaker = "Student" if m.role == "user" else "Partner"
        lines.append(f"{speaker}: {text}")
    if not lines:
        return 0.5

    criteria = load_scenario_criteria(scenario) or ""
    criteria_block = f"\n\nScenario criteria:\n{criteria}" if criteria else ""

    prompt = (
        "You are silently rating an in-progress communication-practice call. "
        "Score how the student is doing RIGHT NOW based on whether they are "
        "staying in the conversation, being clear, steady, and emotionally "
        "regulated — not whether their phrasing is perfect.\n\n"
        f"Scenario: {scenario['title']} — {scenario['goal']}"
        f"{criteria_block}\n\n"
        "Transcript so far:\n"
        + "\n".join(lines)
        + "\n\nReturn ONLY a JSON object of the form: {\"score\": 0.0}\n"
        "score is 0.0 (struggling badly) to 1.0 (handling it well). "
        "No other text, no markdown."
    )
    raw = azure_chat(
        [{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    parsed = parse_json_loose(raw)
    score = parsed.get("score") if isinstance(parsed, dict) else None
    try:
        return max(0.0, min(1.0, float(score)))
    except (TypeError, ValueError):
        return 0.5


class RealtimeTokenRequest(BaseModel):
    scenario_id: str
    prior_messages: list[ChatMessage] | None = None
    replay_partner_line: str | None = None


class RealtimeTokenResponse(BaseModel):
    client_secret: str
    expires_at: int | None = None
    model: str
    voice: str
    language: str | None = None
    partner_opening: str | None = None


def mint_openai_realtime_token(
    scenario: dict[str, Any],
    prior_messages: list[ChatMessage] | None = None,
    replay_partner_line: str | None = None,
) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_ROB", "").strip()
    if not api_key:
        raise RuntimeError(
            "OPENAI_ROB is not set. Add it to .env to enable voice mode."
        )
    instructions = load_partner_voice_prompt(
        scenario,
        prior_messages=prior_messages,
        replay_partner_line=replay_partner_line,
    )
    voice = scenario.get("voice", "alloy")
    payload = {
        "model": OPENAI_REALTIME_MODEL,
        "voice": voice,
        "instructions": instructions,
    }
    req = request.Request(
        OPENAI_REALTIME_SESSIONS_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenAI realtime API error {exc.code}: {details}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Network error calling OpenAI realtime: {exc}") from exc


def transcript_for_tutor(messages: list[ChatMessage]) -> list[dict[str, str]]:
    return [
        {"speaker": m.role, "text": m.text, "timestamp": f"T{idx:02d}"}
        for idx, m in enumerate(messages, start=1)
    ]


def generate_partner_reply(
    scenario: dict[str, Any],
    partner_personality: str,
    messages: list[ChatMessage],
) -> str:
    history = []
    for msg in messages[-12:]:
        speaker = "User" if msg.role == "user" else "Partner"
        history.append(f"{speaker}: {msg.text}")

    system_prompt = load_partner_system_prompt(scenario)
    user_prompt = {
        "scenario_title": scenario["title"],
        "scenario_goal": scenario["goal"],
        "partner_personality": partner_personality,
        "conversation_so_far": history,
        "task": "Write the next partner reply only.",
    }
    reply = azure_chat(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=True)},
        ],
        temperature=0.7,
    )
    return reply.strip().lstrip("Partner:").strip().strip('"')


def get_tutor_feedback(context: dict[str, Any]) -> dict[str, Any]:
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


load_env_file(ENV_PATH)
app = FastAPI(title="SpeakEasy Coach")


@app.get("/")
def serve_mockup() -> FileResponse:
    return FileResponse(MOCKUP_PATH)


@app.get("/api/scenarios")
def list_scenarios() -> list[dict[str, Any]]:
    return SCENARIO_CATALOG


@app.post("/api/partner_reply", response_model=PartnerReplyResponse)
def partner_reply_endpoint(req: PartnerReplyRequest) -> PartnerReplyResponse:
    scenario = get_scenario(req.scenario_id)
    personality = req.partner_personality or scenario["partner_personality"]
    try:
        reply = generate_partner_reply(scenario, personality, req.messages)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return PartnerReplyResponse(reply=reply)


@app.post("/api/live_score", response_model=LiveScoreResponse)
def live_score_endpoint(req: LiveScoreRequest) -> LiveScoreResponse:
    scenario = get_scenario(req.scenario_id)
    try:
        score = compute_live_score(scenario, req.messages)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return LiveScoreResponse(score=score)


@app.post("/api/realtime/token", response_model=RealtimeTokenResponse)
def realtime_token_endpoint(req: RealtimeTokenRequest) -> RealtimeTokenResponse:
    scenario = get_scenario(req.scenario_id)
    if not scenario.get("voice_enabled"):
        raise HTTPException(
            status_code=400,
            detail=f"Scenario '{scenario['id']}' is not enabled for voice mode.",
        )
    try:
        session = mint_openai_realtime_token(
            scenario,
            prior_messages=req.prior_messages,
            replay_partner_line=req.replay_partner_line,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    client_secret_obj = session.get("client_secret") or {}
    client_secret_value = client_secret_obj.get("value") if isinstance(client_secret_obj, dict) else None
    if not client_secret_value:
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI realtime response missing client_secret: {session}",
        )
    return RealtimeTokenResponse(
        client_secret=client_secret_value,
        expires_at=client_secret_obj.get("expires_at") if isinstance(client_secret_obj, dict) else None,
        model=session.get("model", OPENAI_REALTIME_MODEL),
        voice=scenario.get("voice", "alloy"),
        language=scenario.get("language"),
        partner_opening=scenario.get("partner_opening"),
    )


@app.post("/api/tutor_feedback")
def tutor_feedback_endpoint(req: FeedbackRequest) -> dict[str, Any]:
    scenario = get_scenario(req.scenario_id)
    context: dict[str, Any] = {
        "scenario_title": scenario["title"],
        "scenario_category": scenario["category"],
        "scenario_goal": scenario["goal"],
        "scenario_objective_type": scenario["objective_type"],
        "primary_focus_skills": scenario["skills"][:2],
        "secondary_focus_skills": scenario["skills"][2:],
        "difficulty": req.difficulty or scenario["difficulty"],
        "partner_personality": req.partner_personality or scenario["partner_personality"],
        "retry_mode": req.retry_mode,
        "selected_retry_moment": req.selected_retry_moment,
        "transcript": transcript_for_tutor(req.messages),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    criteria = load_scenario_criteria(scenario)
    if criteria:
        context["scenario_criteria"] = criteria
    try:
        return get_tutor_feedback(context)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
