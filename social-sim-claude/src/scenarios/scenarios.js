// Scenario library — each scene defines its environment, the people in it,
// and the conversational "seed topics" they're already discussing when the
// user walks in. Difficulty is 1 (easiest) to 3 (hardest).
//
// Personalities are kept short on purpose so multiple of them fit into the
// LLM context cheaply. Each character has an `elevenVoiceId` (an ElevenLabs
// premade voice id, https://elevenlabs.io/voice-library) chosen to match
// their personality and gender. Voices are picked so that no two characters
// in the SAME scene share the same voice.

export const SCENARIOS = [
  {
    id: 'classroom',
    name: 'Lecture hall, before class',
    sub: '5 minutes before the professor walks in',
    difficulty: 1,
    environment: 'classroom',
    blurb:
      "You're in your usual seat. A few classmates are chatting nearby about the assignment. " +
      "Nobody is watching you. You can listen as long as you want.",
    seedTopics: [
      "the economics homework about supply and demand that is due Friday",
      "how hard the maths test felt last week",
      "the Star Wars movie that was on TV last weekend",
    ],
    characters: [
      {
        id: 'mira',
        name: 'Mira',
        role: 'second-year CS student',
        personality:
          'warm, curious, a bit of a nerd. Gets excited about clever solutions. Patient with shy people.',
        // Rachel — calm, warm young American female
        elevenVoiceId: '21m00Tcm4TlvDq8ikWAM',
        avatarFile: 'avatar-female-1.glb',
        position: [-2.0, 0, -2.5],
      },
      {
        id: 'theo',
        name: 'Theo',
        role: 'second-year CS student',
        personality:
          'sarcastic but harmless, complains about workload, secretly likes the hard problems. ' +
          'Talks fast.',
        // Liam — articulate young American male
        elevenVoiceId: 'TX3LPaxmHKxFdv7VOQHJ',
        avatarFile: 'avatar-male-1.glb',
        position: [0.5, 0, -2.8],
      },
      {
        id: 'anika',
        name: 'Anika',
        role: 'exchange student from Delft',
        personality:
          'thoughtful, soft-spoken, asks gentle clarifying questions. Knows the material well.',
        // Matilda — soft, friendly female
        elevenVoiceId: 'XrExE9yKIg1WjnnlVkGX',
        avatarFile: 'female02_glb.glb',
        position: [-0.7, 0, -1.6],
      },
    ],
  },
  {
    id: 'study-group',
    name: 'Group study session',
    sub: 'Library group room, three people working',
    difficulty: 2,
    environment: 'study',
    blurb:
      "You walk into the booked group room. Three classmates are already inside, working on the same " +
      "problem set you came for. They look up when the door opens.",
    seedTopics: [
      "the supply and demand chapter in the economics textbook",
      "the maths exam coming up next Friday",
      "the Netflix show Stranger Things that one of them just finished",
    ],
    characters: [
      {
        id: 'priya',
        name: 'Priya',
        role: 'organized, takes lead in group work',
        personality:
          'practical, friendly, tries to make sure everyone is contributing. Will ask the new person ' +
          'directly what part they want to take.',
        // Lily — warm, friendly female
        elevenVoiceId: 'pFZP5JQG7iQjIQuC4Bku',
        avatarFile: 'avatar-female-1.glb',
        position: [-2.3, 0, -2.3],
      },
      {
        id: 'marcus',
        name: 'Marcus',
        role: 'quiet thinker, top of the class',
        personality:
          'reserved, gives short precise answers, looks at the table when speaking. Surprisingly funny ' +
          'if drawn out.',
        // Brian — deep, thoughtful, measured male
        elevenVoiceId: 'nPczCjzI2devNBz1zQrb',
        avatarFile: 'avatar-male-1.glb',
        position: [-0.1, 0, -3.3],
      },
      {
        id: 'lena',
        name: 'Lena',
        role: 'visiting student, very social',
        personality:
          'high energy, asks the new person 3 questions in a row, sincere not pushy.',
        // Domi — strong, confident, energetic young female
        elevenVoiceId: 'AZnzlk1XvdvUeBnXmlld',
        avatarFile: 'female02_glb.glb',
        position: [2.2, 0, -2.3],
      },
    ],
  },
  {
    id: 'networking',
    name: 'Career networking mixer',
    sub: 'Loud room. Nametags. Free drinks.',
    difficulty: 3,
    environment: 'mixer',
    blurb:
      "Your university's career office is hosting a mixer with alumni. People are standing in clusters " +
      "of three or four. You're holding a drink you don't really want.",
    seedTopics: [
      "what it was actually like working as a junior developer at a big company like Google",
      "the kinds of interview questions companies are asking new graduates this year",
      "how the job market for university graduates looks right now",
    ],
    characters: [
      {
        id: 'noor',
        name: 'Noor',
        role: 'master\'s student, second year',
        personality:
          'a bit nervous herself, friendly to anyone who looks more nervous than she does. ' +
          'Forms quick alliances.',
        // Bella — soft, gentle young female
        elevenVoiceId: 'EXAVITQu4vr4xnSDxMaL',
        avatarFile: 'female02_glb.glb',
        position: [-1.4, 0, -2.4],
      },
      {
        id: 'elena',
        name: 'Elena',
        role: 'career office organizer',
        personality:
          'upbeat, introduces people to each other, remembers everyone\'s name. Loves connecting strangers.',
        // Jessica — expressive, animated young female
        elevenVoiceId: 'cgSgspJ2msm6clMCkdW9',
        avatarFile: 'avatar-female-1.glb',
        position: [0.0, 0, -2.7],
      },
      {
        id: 'raj',
        name: 'Raj',
        role: 'final-year engineering student',
        personality:
          'earnest, a little awkward, asks thoughtful questions about careers. Tries too hard but means well.',
        // Liam — articulate young American male
        elevenVoiceId: 'TX3LPaxmHKxFdv7VOQHJ',
        avatarFile: 'avatar-male-1.glb',
        position: [1.3, 0, -2.2],
      },
    ],
  },
];

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id);
}
