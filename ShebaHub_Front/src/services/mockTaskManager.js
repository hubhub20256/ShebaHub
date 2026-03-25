const RESEARCH_MEMBERSHIP_MOCKS = [
  {
    id: "r-neuro-ai-101",
    title: "AI לזיהוי מוקדם של הידרדרות נוירולוגית",
    role: "מתלמד/ת",
    mentor: 'ד"ר יעל בן-דוד',
    institution: "שיבא תל השומר",
  },
  {
    id: "r-cardiac-ux-204",
    title: "חווית מטופל דיגיטלית במרפאות לב",
    role: "מתלמד/ת",
    mentor: "פרופ' נטע כהן",
    institution: "שיבא תל השומר",
  },
  {
    id: "r-onco-data-319",
    title: "ניתוח דאטה אונקולוגי מבוסס רשומות",
    role: "מתלמד/ת",
    mentor: 'ד"ר ניר לוי',
    institution: "אוניברסיטת תל אביב",
  },
];

export function listMockResearchMemberships(user) {
  const userSeed = Number(user?.id || 0);
  if (!userSeed) return RESEARCH_MEMBERSHIP_MOCKS.slice(0, 2);

  if (userSeed % 2 === 0) {
    return RESEARCH_MEMBERSHIP_MOCKS;
  }

  return RESEARCH_MEMBERSHIP_MOCKS.slice(0, 2);
}

export function getResearchBoardStorageKey(user) {
  const scope = user?.id ? `u-${user.id}` : "guest";
  return `shebahub-task-board-by-research-v1:${scope}`;
}

export function buildMockSeedTasks(research, currentUser) {
  const now = Date.now();
  return [
    {
      id: `${research.id}-seed-1`,
      title: "איסוף מקורות ראשוני",
      assignmentType: "manager_to_apprentice",
      assigneeName: currentUser,
      priority: "medium",
      dueDate: new Date(now + 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      description: "בניית רשימת 8-10 מאמרים עדכניים וריכוז ממצאים עיקריים.",
      createdBy: "מנהל/ת המחקר",
      status: "open",
      thread: [],
      files: [],
      createdAt: new Date(now).toISOString(),
    },
  ];
}
