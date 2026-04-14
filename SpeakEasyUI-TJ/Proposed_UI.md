# Proposed Experience Mockup

## Product Positioning
**Working title:** SpeakEasy Coach  
**Promise:** A safe voice practice room for real-life conversations.

This mockup is designed for stakeholder sharing, so it focuses on user-facing screens, key interactions, and feature intent rather than implementation detail.

---

## Experience Flow
`Home` -> `Scenario Setup` -> `Live Conversation` -> `Transition` -> `Feedback` -> `Retry` -> `Progress`

---

## 1) Home / Scenario Selection
**Goal:** Help users quickly pick what they want to practice with low cognitive load.

### Layout Mockup
```text
+--------------------------------------------------------------+
| SpeakEasy Coach                                              |
| Practice real conversations in a safe space                  |
|--------------------------------------------------------------|
| [ Search scenario...                          ] [Filter: All]|
|                                                              |
| [Card] Join a Group Conversation          (Small Talk)       |
|       "Practice entering an ongoing chat" [Beginner v]      |
|                                                              |
| [Card] Ask Teacher/Manager for Help        (Assertiveness)   |
|       "Make clear requests confidently"    [Beginner v]      |
|                                                              |
| [Card] Say No Politely                      (Boundaries)      |
| [Card] Job/Internship Interview             (High Stakes)     |
|                                                              |
| Last practiced: Ask Teacher/Manager for Help                 |
+--------------------------------------------------------------+
```

### Key Features
- Scenario cards with short, clear descriptions.
- Difficulty selector per scenario (`Beginner`, `Intermediate`, `Advanced`).
- Optional tags (`Small Talk`, `Assertiveness`, `Interview`, `Recovery`).
- Resume recent scenario.

---

## 2) Scenario Setup (Lightweight)
**Goal:** Give just enough context before starting, without overwhelming the user.

### Layout Mockup
```text
+--------------------------------------------------------------+
| Scenario: Ask a Professor for Help                           |
|--------------------------------------------------------------|
| Your role: Student who needs clarification on assignment     |
| Context: Office hours, short conversation                    |
|                                                              |
| Partner personality: [ Friendly v ]                          |
| Conversation length: [ 3-5 mins v ]                          |
| Focus skill: [ Clarity v ]                                   |
|                                                              |
| [ Start Conversation ]                                       |
| [ Back ]                                                     |
+--------------------------------------------------------------+
```

### Key Features
- Role and context preview (1-2 lines).
- Personality mode (`Friendly`, `Neutral`, `Slightly Impatient`).
- Optional skill focus for personalized coaching.

---

## 3) Live Conversation (Core Screen)
**Goal:** Keep users focused on speaking, not navigating UI.

### Layout Mockup
```text
+--------------------------------------------------------------+
| Ask a Professor for Help                    Timer: 02:14     |
|--------------------------------------------------------------|
| Partner status: Listening...                                  |
|                                                              |
|                    [ Animated voice orb ]                    |
|                      You are speaking...                     |
|                                                              |
| [ Pause ]   [ End ]   [ I don't know what to say ]          |
|                                                              |
| Optional transcript (collapsed) [Show]                       |
+--------------------------------------------------------------+
```

### Key Features
- Large mic/voice state indicator (`Listening`, `Speaking`, `Thinking`).
- Stress-reducing helper: `I don't know what to say`.
- Pause/end controls for emotional safety.
- Optional transcript to reduce pressure.

---

## 4) Transition Screen
**Goal:** Create psychological separation between performance and evaluation.

### Layout Mockup
```text
+--------------------------------------------------------------+
| Analyzing your conversation...                               |
|                                                              |
| Finding strengths, moments to improve, and alternative lines |
|                                                              |
| [ loading animation ]                                        |
+--------------------------------------------------------------+
```

### Key Features
- Short wait state with supportive language.
- No scores shown here; avoids immediate judgment.

---

## 5) Feedback Screen (High Value)
**Goal:** Turn one conversation into actionable learning.

### Layout Mockup
```text
+--------------------------------------------------------------+
| Feedback: Ask a Professor for Help                           |
|--------------------------------------------------------------|
| What went well                                               |
| - You explained your issue clearly.                          |
| - Your tone was polite and respectful.                       |
|                                                              |
| Improve next time (focus: assertiveness)                     |
| - You apologized 3 times; one apology is enough.             |
| - Your request became indirect near the end.                 |
|                                                              |
| Suggested phrasing                                           |
| Instead of: "Sorry, maybe if you have time..."              |
| Try:       "Could we go over question 3 together?"          |
|                                                              |
| Highlighted moments                                          |
| [00:48] Hesitation before request                            |
| [01:22] Strong clear ask                                     |
|                                                              |
| [ Retry Full Scenario ] [ Retry Highlight ] [ Continue ]     |
+--------------------------------------------------------------+
```

### Key Features
- Positive reinforcement first.
- Only 1-2 improvement points to avoid overload.
- Concrete rephrasing suggestions.
- Timestamped highlights for targeted practice.

---

## 6) Retry Experience
**Goal:** Convert feedback into immediate skill repetition.

### Layout Mockup
```text
+--------------------------------------------------------------+
| Choose your retry mode                                       |
|--------------------------------------------------------------|
| ( ) Full conversation restart                                |
| ( ) Retry from highlighted moment (00:48)                    |
| ( ) Try your own improved response first                     |
|                                                              |
| [ Start Retry ]                                              |
+--------------------------------------------------------------+
```

### Key Features
- Full retry or moment-based retry.
- User attempts improved phrasing before seeing AI suggestion.
- Fast loop from feedback to action.

---

## 7) Progress Screen
**Goal:** Reinforce confidence and make growth visible over time.

### Layout Mockup
```text
+--------------------------------------------------------------+
| Your Growth                                                  |
|--------------------------------------------------------------|
| Sessions this week: 4     Current streak: 3 days             |
|                                                              |
| Skill trends                                                 |
| Clarity        [#######---] +12%                             |
| Engagement     [######----] +8%                              |
| Assertiveness  [#####-----] +15%                             |
|                                                              |
| This week you improved in:                                   |
| - Asking direct follow-up questions                          |
| - Reducing over-apologizing                                  |
|                                                              |
| [ Practice Again ]                                           |
+--------------------------------------------------------------+
```

### Key Features
- Growth-oriented indicators, not grades.
- Confidence-focused insights (`you improved in...`).
- Easy re-entry into next practice session.

---

## Feature Checklist (MVP vs Nice-to-Have)
### MVP
- Voice conversation loop.
- Scenario selection.
- Tutor feedback with strengths + improvements.
- Suggested phrasing.
- Retry options.

### Nice-to-Have
- Partner personality tuning.
- Timestamped transcript highlights.
- Weekly trend view.
- Custom skill goals.

---

## Tone & UX Rules (For Team Alignment)
- Always supportive, never judgmental.
- Keep cognitive load low on every screen.
- Show strengths before improvements.
- Prioritize retry loops over scoring mechanics.
- Product should feel like practice, not evaluation.

