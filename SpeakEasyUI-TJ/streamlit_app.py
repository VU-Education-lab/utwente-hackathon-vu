#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib import error, request

import streamlit as st


ROOT = Path(__file__).resolve().parent
TUTOR_PROMPT_PATH = ROOT / "tutor_prompt.txt"
ENV_PATH = ROOT / ".env"

STEP_ORDER = ["home", "setup", "call", "transition", "feedback", "retry", "progress"]
STEP_LABELS = {
    "home": "1. Home",
    "setup": "2. Setup",
    "call": "3. Call",
    "transition": "4. Analyze",
    "feedback": "5. Feedback",
    "retry": "6. Retry",
    "progress": "7. Progress",
}


def scenario_catalog() -> list[dict[str, Any]]:
    return [
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
        },
    ]


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


def category_options() -> list[tuple[str, str]]:
    return [
        ("all", "All categories"),
        ("social-micro", "Social Micro"),
        ("assertiveness-boundary", "Assertiveness & Boundary"),
        ("professional-performance", "Professional & Performance"),
        ("ambiguity-recovery", "Ambiguity & Recovery"),
        ("professional-conflict", "Professional Conflict-Lite"),
    ]


def skill_options() -> list[tuple[str, str]]:
    return [
        ("all", "All skills"),
        ("opening-lines", "Opening Lines"),
        ("assertiveness", "Assertiveness"),
        ("clarity", "Clarity"),
        ("confidence-signals", "Confidence Signals"),
        ("recovery", "Recovery"),
        ("active-listening", "Active Listening"),
    ]


def difficulty_options() -> list[tuple[str, str]]:
    return [
        ("all", "All levels"),
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]


def inject_styles() -> None:
    st.markdown(
        """
<style>
  .journey-wrap {display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 18px 0;}
  .step-chip {
    border: 1px solid #d5c8ae; border-radius: 10px; padding: 6px 10px;
    background: #fff6e6; color: #7f6b44; font-size: 0.8rem; font-weight: 600;
  }
  .step-chip.active {
    border-color: #ff6b35; color: #ff6b35; background: #fff;
    box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.12);
  }
  .card-soft {
    border: 1px solid #d5c8ae; border-radius: 12px; padding: 12px; background: #f8f3e8;
    margin-bottom: 10px;
  }
  .small-note { color: #5e6b78; font-size: 0.86rem; }
  .pill {
    display: inline-block; font-size: 0.75rem; padding: 2px 8px; border-radius: 999px;
    border: 1px solid #d5c8ae; color: #5e6b78; margin-right: 6px; margin-bottom: 6px;
  }
</style>
""",
        unsafe_allow_html=True,
    )


def init_state(catalog: list[dict[str, Any]]) -> None:
    if "step" not in st.session_state:
        st.session_state.step = "home"
    if "selected_scenario_id" not in st.session_state:
        st.session_state.selected_scenario_id = "ask_professor_help"
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "feedback" not in st.session_state:
        st.session_state.feedback = None
    if "show_extended_library" not in st.session_state:
        st.session_state.show_extended_library = False
    if "show_advanced_filters" not in st.session_state:
        st.session_state.show_advanced_filters = False
    if "category_filter" not in st.session_state:
        st.session_state.category_filter = "all"
    if "skill_filter" not in st.session_state:
        st.session_state.skill_filter = "all"
    if "difficulty_filter" not in st.session_state:
        st.session_state.difficulty_filter = "all"
    if "setup_partner_personality" not in st.session_state:
        st.session_state.setup_partner_personality = "friendly"
    if "setup_difficulty" not in st.session_state:
        st.session_state.setup_difficulty = "beginner"
    if "retry_mode" not in st.session_state:
        st.session_state.retry_mode = "first_attempt"
    if "selected_retry_moment" not in st.session_state:
        st.session_state.selected_retry_moment = None
    if "helper_suggestion" not in st.session_state:
        st.session_state.helper_suggestion = ""

    # Ensure selected scenario defaults are applied once.
    selected = get_selected_scenario(catalog)
    st.session_state.setup_partner_personality = st.session_state.get(
        "setup_partner_personality", selected.get("partner_personality", "friendly")
    )
    st.session_state.setup_difficulty = st.session_state.get(
        "setup_difficulty", selected.get("difficulty", "beginner")
    )


def get_selected_scenario(catalog: list[dict[str, Any]]) -> dict[str, Any]:
    selected_id = st.session_state.selected_scenario_id
    for scenario in catalog:
        if scenario["id"] == selected_id:
            return scenario
    return catalog[0]


def go_to_step(step: str) -> None:
    st.session_state.step = step


def select_scenario(scenario: dict[str, Any]) -> None:
    st.session_state.selected_scenario_id = scenario["id"]
    st.session_state.setup_partner_personality = scenario["partner_personality"]
    st.session_state.setup_difficulty = scenario["difficulty"]
    st.session_state.messages = []
    st.session_state.feedback = None
    st.session_state.retry_mode = "first_attempt"
    st.session_state.selected_retry_moment = None
    go_to_step("setup")


def partner_opening_line(scenario: dict[str, Any], partner_personality: str) -> str:
    opening = "Hi, what can I help you with today?"
    if scenario["category"] == "professional-performance":
        opening = "Thanks for joining. Tell me why you're a good fit."
    elif scenario["category"] == "professional-conflict":
        opening = "I think there was a mismatch. Can you clarify your side?"
    elif scenario["category"] == "ambiguity-recovery":
        opening = "Hmm, okay. What did you mean by that?"
    if partner_personality == "friendly":
        return opening
    if partner_personality == "neutral":
        return opening
    return opening + " Keep it brief."


def start_conversation(scenario: dict[str, Any]) -> None:
    st.session_state.messages = [
        {
            "role": "partner",
            "text": partner_opening_line(scenario, st.session_state.setup_partner_personality),
            "at": datetime.utcnow().isoformat(),
        }
    ]
    st.session_state.feedback = None
    st.session_state.helper_suggestion = ""
    go_to_step("call")


def transcript_for_tutor(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    transcript: list[dict[str, str]] = []
    for idx, msg in enumerate(messages, start=1):
        transcript.append(
            {
                "speaker": msg["role"],
                "text": msg["text"],
                "timestamp": f"T{idx:02d}",
            }
        )
    return transcript


def build_tutor_context(scenario: dict[str, Any], messages: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "scenario_title": scenario["title"],
        "scenario_category": scenario["category"],
        "scenario_goal": scenario["goal"],
        "scenario_objective_type": scenario["objective_type"],
        "primary_focus_skills": scenario["skills"][:2],
        "secondary_focus_skills": scenario["skills"][2:],
        "difficulty": st.session_state.setup_difficulty,
        "partner_personality": st.session_state.setup_partner_personality,
        "retry_mode": st.session_state.retry_mode,
        "selected_retry_moment": st.session_state.selected_retry_moment,
        "transcript": transcript_for_tutor(messages),
    }


def generate_partner_reply(scenario: dict[str, Any], messages: list[dict[str, str]]) -> str:
    history = []
    for msg in messages[-12:]:
        speaker = "User" if msg["role"] == "user" else "Partner"
        history.append(f"{speaker}: {msg['text']}")

    system_prompt = (
        "You are a simulated conversation partner in a communication practice app.\n"
        "Stay in scenario and keep each reply to 1-3 sentences.\n"
        "Do not provide coaching or analysis.\n"
        "Respond naturally based on partner personality and scenario context.\n"
        "Ask a useful follow-up question when possible."
    )
    user_prompt = {
        "scenario_title": scenario["title"],
        "role_context": scenario["role"],
        "scenario_goal": scenario["goal"],
        "partner_personality": st.session_state.setup_partner_personality,
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
    return reply.strip()


def helper_line(scenario: dict[str, Any]) -> str:
    skill = scenario["skills"][0].replace("-", " ")
    return f"Try a short opener focused on {skill}: 'I want to ask about question 3 and be direct.'"


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


def render_journey() -> None:
    current = st.session_state.step
    chips = []
    for step in STEP_ORDER:
        cls = "step-chip active" if step == current else "step-chip"
        chips.append(f'<span class="{cls}">{STEP_LABELS[step]}</span>')
    st.markdown(f'<div class="journey-wrap">{"".join(chips)}</div>', unsafe_allow_html=True)


def filtered_scenarios(catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for s in catalog:
        if not st.session_state.show_extended_library and s["tier"] != "core":
            continue
        if st.session_state.category_filter != "all" and s["category"] != st.session_state.category_filter:
            continue
        if st.session_state.skill_filter != "all" and st.session_state.skill_filter not in s["skills"]:
            continue
        if st.session_state.difficulty_filter != "all" and s["difficulty"] != st.session_state.difficulty_filter:
            continue
        out.append(s)
    return out


def render_home(catalog: list[dict[str, Any]]) -> None:
    st.subheader("Choose A Practice Scenario")
    st.caption("Pick one real-world conversation to rehearse today.")

    c1, c2, c3 = st.columns([1.5, 1, 1])
    with c1:
        category_map = dict(category_options())
        selected_label = category_map.get(st.session_state.category_filter, "All categories")
        picked = st.selectbox("Category", list(category_map.values()), index=list(category_map.values()).index(selected_label))
        st.session_state.category_filter = {v: k for k, v in category_map.items()}[picked]
    with c2:
        if st.button("More Filters", use_container_width=True):
            st.session_state.show_advanced_filters = not st.session_state.show_advanced_filters
    with c3:
        label = "Show Core Only" if st.session_state.show_extended_library else "Show Extended Library"
        if st.button(label, use_container_width=True):
            st.session_state.show_extended_library = not st.session_state.show_extended_library

    if st.session_state.show_advanced_filters:
        f1, f2 = st.columns(2)
        with f1:
            skill_map = dict(skill_options())
            skill_label = skill_map.get(st.session_state.skill_filter, "All skills")
            skill_pick = st.selectbox("Skill Tag", list(skill_map.values()), index=list(skill_map.values()).index(skill_label))
            st.session_state.skill_filter = {v: k for k, v in skill_map.items()}[skill_pick]
        with f2:
            diff_map = dict(difficulty_options())
            diff_label = diff_map.get(st.session_state.difficulty_filter, "All levels")
            diff_pick = st.selectbox("Difficulty", list(diff_map.values()), index=list(diff_map.values()).index(diff_label))
            st.session_state.difficulty_filter = {v: k for k, v in diff_map.items()}[diff_pick]

    st.markdown('<p class="small-note">Clean mode shows core scenarios first. Open extended library when needed.</p>', unsafe_allow_html=True)

    visible = filtered_scenarios(catalog)
    if not visible:
        st.info("No scenarios match these filters. Try broadening category or skill tags.")
        return

    grouped: dict[str, list[dict[str, Any]]] = {}
    for s in visible:
        grouped.setdefault(s["category_label"], []).append(s)

    for category, entries in grouped.items():
        st.markdown(f"### {category}")
        cols = st.columns(2)
        for idx, scenario in enumerate(entries):
            with cols[idx % 2]:
                with st.container(border=True):
                    st.markdown(f"**{scenario['title']}**")
                    st.markdown(
                        f'<span class="pill">{scenario["difficulty"].capitalize()}</span>'
                        + "".join([f'<span class="pill">{skill.replace("-", " ").title()}</span>' for skill in scenario["skills"][:2]]),
                        unsafe_allow_html=True,
                    )
                    st.write(scenario["focus_text"])
                    if st.button("Practice This", key=f"pick_{scenario['id']}", use_container_width=True):
                        select_scenario(scenario)
                        st.rerun()


def render_setup(scenario: dict[str, Any]) -> None:
    st.subheader("Scenario Setup")
    st.caption("Light context before starting.")
    st.markdown('<div class="card-soft">', unsafe_allow_html=True)
    st.write(f"**Scenario:** {scenario['title']}")
    st.write(f"**Role:** {scenario['role']}")
    st.write(f"**Goal:** {scenario['goal']}")
    st.markdown("</div>", unsafe_allow_html=True)

    col1, col2 = st.columns(2)
    with col1:
        st.session_state.setup_partner_personality = st.selectbox(
            "Partner Personality",
            ["friendly", "neutral", "slightly impatient", "reserved"],
            index=["friendly", "neutral", "slightly impatient", "reserved"].index(
                st.session_state.setup_partner_personality
                if st.session_state.setup_partner_personality in ["friendly", "neutral", "slightly impatient", "reserved"]
                else "friendly"
            ),
        )
    with col2:
        st.session_state.setup_difficulty = st.selectbox(
            "Difficulty",
            ["beginner", "intermediate", "advanced"],
            index=["beginner", "intermediate", "advanced"].index(
                st.session_state.setup_difficulty
                if st.session_state.setup_difficulty in ["beginner", "intermediate", "advanced"]
                else scenario["difficulty"]
            ),
        )

    b1, b2 = st.columns(2)
    with b1:
        if st.button("Back", use_container_width=True):
            go_to_step("home")
            st.rerun()
    with b2:
        if st.button("Start Conversation", type="primary", use_container_width=True):
            start_conversation(scenario)
            st.rerun()


def render_call(scenario: dict[str, Any]) -> None:
    st.subheader("Live Conversation")
    st.caption("Text-mode simulation for now.")

    controls = st.columns(3)
    with controls[0]:
        st.button("Pause", disabled=True, use_container_width=True)
    with controls[1]:
        if st.button("I Don't Know What To Say", use_container_width=True):
            st.session_state.helper_suggestion = helper_line(scenario)
    with controls[2]:
        if st.button("End Conversation", type="primary", use_container_width=True):
            go_to_step("transition")
            st.rerun()

    if st.session_state.helper_suggestion:
        st.info(st.session_state.helper_suggestion)

    for msg in st.session_state.messages:
        role = "assistant" if msg["role"] == "partner" else "user"
        name = "Partner" if msg["role"] == "partner" else "You"
        with st.chat_message(role):
            st.markdown(f"**{name}:** {msg['text']}")

    user_input = st.chat_input("Type your response...")
    if user_input:
        st.session_state.messages.append({"role": "user", "text": user_input, "at": datetime.utcnow().isoformat()})
        with st.spinner("Partner is replying..."):
            try:
                reply = generate_partner_reply(scenario, st.session_state.messages)
                st.session_state.messages.append({"role": "partner", "text": reply, "at": datetime.utcnow().isoformat()})
                st.rerun()
            except RuntimeError as exc:
                st.error(str(exc))

    with st.expander("Transcript"):
        st.json(transcript_for_tutor(st.session_state.messages))


def render_transition(scenario: dict[str, Any]) -> None:
    st.subheader("Analyzing Your Conversation...")
    st.caption("Finding strengths, growth points, and better phrasing options.")
    st.info("This creates separation between performance and feedback.")

    c1, c2 = st.columns(2)
    with c1:
        if st.button("Back To Conversation", use_container_width=True):
            go_to_step("call")
            st.rerun()
    with c2:
        if st.button("Generate Feedback", type="primary", use_container_width=True):
            if len(st.session_state.messages) < 2:
                st.warning("Add at least one user message before feedback.")
                return
            with st.spinner("Tutor is preparing feedback..."):
                try:
                    context = build_tutor_context(scenario, st.session_state.messages)
                    st.session_state.feedback = get_tutor_feedback(context)
                    go_to_step("feedback")
                    st.rerun()
                except RuntimeError as exc:
                    st.error(str(exc))


def render_feedback() -> None:
    feedback = st.session_state.feedback
    st.subheader("Supportive Coaching")
    st.caption("Strengths first, then 1-2 focused improvements.")

    if not feedback:
        st.warning("No feedback yet. Generate feedback first.")
        if st.button("Go To Analyze Step", use_container_width=True):
            go_to_step("transition")
            st.rerun()
        return

    if "raw_text" in feedback:
        st.warning("Tutor returned non-JSON output. Showing raw text.")
        st.write(feedback["raw_text"])
    else:
        st.markdown("**What went well**")
        st.write(feedback.get("what_went_well", ""))
        st.markdown("**Improve next time**")
        st.write(feedback.get("improve_next_time", ""))

        rewrite = feedback.get("try_this_instead", {})
        st.markdown("**Try this instead**")
        if isinstance(rewrite, dict):
            st.write(f"Instead of: {rewrite.get('instead_of', '')}")
            st.write(f"Try: {rewrite.get('try', '')}")
            st.write(f"Why it works: {rewrite.get('why_it_works', '')}")

        moments = feedback.get("highlighted_moments", [])
        if moments:
            st.markdown("**Highlighted moments**")
            for m in moments:
                label = m.get("timestamp_or_label", "")
                note = m.get("note", "")
                typ = m.get("type", "")
                st.write(f"- [{label}] ({typ}) {note}")

        st.markdown("**Retry prompt**")
        st.write(feedback.get("retry_prompt", ""))

    b1, b2 = st.columns(2)
    with b1:
        if st.button("Retry Options", use_container_width=True):
            go_to_step("retry")
            st.rerun()
    with b2:
        if st.button("Continue", type="primary", use_container_width=True):
            go_to_step("progress")
            st.rerun()

    with st.expander("Feedback JSON"):
        st.json(feedback)


def extract_retry_moment(feedback: dict[str, Any]) -> str | None:
    moments = feedback.get("highlighted_moments", []) if isinstance(feedback, dict) else []
    for m in moments:
        if m.get("type") == "retry":
            return str(m.get("timestamp_or_label", ""))
    return None


def render_retry(scenario: dict[str, Any]) -> None:
    st.subheader("Immediate Retry")
    st.caption("Practice again now while feedback is fresh.")

    mode = st.radio(
        "Choose retry mode",
        ["full_retry", "moment_retry", "first_attempt"],
        format_func=lambda v: {
            "full_retry": "Retry full conversation",
            "moment_retry": "Retry from highlighted moment",
            "first_attempt": "Try your improved answer first",
        }[v],
    )

    b1, b2, b3 = st.columns(3)
    with b1:
        if st.button("Back To Feedback", use_container_width=True):
            go_to_step("feedback")
            st.rerun()
    with b2:
        if st.button("Start Retry", type="primary", use_container_width=True):
            st.session_state.retry_mode = mode
            st.session_state.selected_retry_moment = extract_retry_moment(st.session_state.feedback)
            start_conversation(scenario)
            st.rerun()
    with b3:
        if st.button("Skip To Progress", use_container_width=True):
            go_to_step("progress")
            st.rerun()


def render_progress() -> None:
    st.subheader("Growth Snapshot")
    st.caption("Progress is framed as confidence-building, not grading.")

    st.metric("Sessions this week", "4")
    st.metric("Current streak", "3 days")
    st.markdown("**Skill trends**")
    st.write("Clarity (+12%)")
    st.progress(0.74)
    st.write("Engagement (+8%)")
    st.progress(0.62)
    st.write("Assertiveness (+15%)")
    st.progress(0.67)
    st.success("This week you improved in direct follow-up questions and reducing over-apologizing.")

    if st.button("Practice Another Scenario", type="primary", use_container_width=True):
        st.session_state.messages = []
        st.session_state.feedback = None
        st.session_state.retry_mode = "first_attempt"
        st.session_state.selected_retry_moment = None
        go_to_step("home")
        st.rerun()


def main() -> None:
    st.set_page_config(page_title="SpeakEasy Coach", page_icon="🗣️", layout="wide")
    load_env_file(ENV_PATH)
    catalog = scenario_catalog()
    init_state(catalog)
    inject_styles()

    st.title("SpeakEasy Coach")
    st.caption("Merged prototype: mockup journey flow + live text partner + tutor feedback")
    render_journey()

    scenario = get_selected_scenario(catalog)
    step = st.session_state.step

    if step == "home":
        render_home(catalog)
    elif step == "setup":
        render_setup(scenario)
    elif step == "call":
        render_call(scenario)
    elif step == "transition":
        render_transition(scenario)
    elif step == "feedback":
        render_feedback()
    elif step == "retry":
        render_retry(scenario)
    elif step == "progress":
        render_progress()
    else:
        st.session_state.step = "home"
        st.rerun()


if __name__ == "__main__":
    main()
