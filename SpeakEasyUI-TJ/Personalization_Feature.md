# Personalization Feature: Dynamic Scenario Adaptation

## Goal
Add an optional personalization layer so scenario prompts are slightly adapted to the user’s real context, while keeping the same core learning objective and difficulty.

The result should feel:
- more relatable
- more motivating
- still structured for skill practice

---

## Why This Matters
Users engage better when practice feels relevant to their life.  
If the app can reflect their typical situations, anxiety triggers, and communication goals, each scenario can feel less generic and more useful.

---

## Scope
Personalization should **adjust framing**, not replace the scenario library.

Allowed adaptations:
- context details (class/team/friend setting)
- partner style emphasis (friendly/neutral/slightly impatient)
- wording examples tied to user context
- coaching focus priority

Not allowed:
- changing core scenario category unexpectedly
- increasing emotional intensity beyond selected difficulty
- introducing unsafe, hostile, or shaming content

---

## Inputs (From Intake + Session)
### Intake profile (optional)
- communication goals
- common anxiety triggers
- preferred tone (`gentle`, `balanced`, `direct`)
- feedback intensity (`light`, `standard`, `stretch`)
- preferred scenario types
- self-reported confidence (`low`, `medium`, `high`)
- language/cultural notes (optional)

### Session context
- selected scenario
- selected difficulty
- focus skill(s)
- prior patterns/progress (if available)

---

## Dynamic Adaptation Rules
For each practice session:

1. Keep fixed:
- scenario category
- learning objective
- selected difficulty band

2. Adapt lightly:
- role/context sentence
- partner’s first line
- one optional challenge detail
- suggested phrasing style

3. Adapt coaching priority:
- primary feedback tied to selected focus skills
- secondary feedback tied to user intake goals

4. Constrain intensity:
- if confidence is `low`, reduce pressure and ambiguity
- if feedback intensity is `light`, max 1 improvement point
- if `stretch`, allow 2 improvements when high-value

---

## Example Transformations
### Base scenario
`Ask a teacher/manager for help`

### User A profile
- trigger: fear of sounding incompetent
- tone preference: gentle
- confidence: low

Adapted prompt:
- Role: “You’re asking your professor for clarification on question 3.”
- Partner opening: “Of course, happy to help. What part feels unclear?”
- Focus: clarity + one direct ask

### User B profile
- goal: speak more directly in work settings
- tone preference: direct
- confidence: medium

Adapted prompt:
- Role: “You’re asking your manager for support on a project blocker.”
- Partner opening: “What do you need from me to move this forward?”
- Focus: concise ask + assertive wording

---

## Prompt Assembly Model
Use a two-layer approach:

1. Base scenario template
- canonical objective, constraints, and skill targets

2. Personalization overlay
- user-specific adjustments to context/tone/challenge wording

Final runtime prompt = `base template + personalization overlay + session settings`

---

## UX Integration
### Intake entry points
- Optional onboarding intake (“Help us tailor your practice”)
- Profile settings edit page
- Lightweight in-session toggle (“Use my personalization” on/off)

### In-session transparency
Show a small note:
- “Personalized for: asking clearly under pressure”

Allow quick reset:
- “Use standard scenario”

---

## Safety + Product Guardrails
- Never diagnose or label user traits.
- Never frame anxiety as failure.
- Avoid stereotyping based on profile data.
- Do not overfit: keep prompts recognizable and comparable across users.
- Keep adaptations small enough for fair progress tracking.

---

## Data + Logging (Recommended)
Store:
- intake version
- applied adaptation flags
- scenario template id
- overlay id

This helps:
- reproducibility
- A/B testing
- auditing prompt quality and safety

---

## MVP Rollout Plan
1. Phase 1: manual intake fields + simple rule-based overlays
2. Phase 2: add prior-session pattern adaptation
3. Phase 3: experiment with smarter adaptive prompt selection

Start small and keep behavior predictable.

