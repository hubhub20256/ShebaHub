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
  return `shebahub-task-board-by-research-v2:${scope}`;
}

export function buildMockSeedTasks(research, currentUser) {
  const now = Date.now();
  const seedTemplates = [
    [
      "איסוף מקורות ראשוני",
      "medium",
      "open",
      6,
      "בניית רשימת מאמרים עדכניים וריכוז ממצאים עיקריים.",
    ],
    [
      "מיפוי שאלות מחקר",
      "high",
      "open",
      3,
      "גיבוש 5 שאלות ליבה ומדדי הצלחה לכל שאלה.",
    ],
    [
      "בניית טבלת נתונים",
      "medium",
      "open",
      8,
      "הגדרת שדות, פורמט אחיד, וחוקי איכות נתונים.",
    ],
    [
      "תיאום ישיבת סטטוס",
      "low",
      "completed",
      -1,
      "עדכון התקדמות שבועי מול צוות המחקר.",
    ],
    [
      "טיוטת פרק מבוא",
      "high",
      "needs_help",
      2,
      "כתיבת פרק מבוא עם 3 מקורות מרכזיים.",
    ],
    [
      "בדיקות עקביות נתונים",
      "medium",
      "open",
      5,
      "זיהוי חריגות ויישור ערכים חסרים.",
    ],
    [
      "סיכום ממצאים ביניים",
      "medium",
      "completed",
      -2,
      "סיכום תובנות ביניים עבור המנחה.",
    ],
    ["הכנת מצגת לצוות", "low", "open", 9, "מצגת קצרה עם KPI והמלצות להמשך."],
    [
      "ולידציית מודל ראשונית",
      "high",
      "needs_help",
      1,
      "הרצה על מדגם ובדיקת דיוק ראשוני.",
    ],
    ["תיעוד תהליך עבודה", "low", "open", 12, "תיעוד שלבי עבודה וכלי עזר."],
    [
      "מעקב משימות שבועי",
      "medium",
      "open",
      4,
      "עדכון סטטוס יומי וסגירת חסמים.",
    ],
    [
      "ניתוח סטטיסטי בסיסי",
      "high",
      "completed",
      -3,
      "חישוב מדדים בסיסיים וגרפים תומכים.",
    ],
    [
      "סקירת אתיקה ופרטיות",
      "medium",
      "open",
      7,
      "בדיקת עמידה בהנחיות פרטיות מידע.",
    ],
    [
      "בדיקת איכות נספחים",
      "low",
      "open",
      10,
      "ווידוא תקינות קבצים ותיוג נכון.",
    ],
    ["תכנון ניסוי המשך", "high", "open", 11, "הצעת ניסוי המשך בהתאם לממצאים."],
  ];

  return seedTemplates.map(
    ([title, priority, status, daysDelta, description], idx) => ({
      id: `${research.id}-seed-${idx + 1}`,
      title,
      assignmentType:
        idx % 3 === 0 ? "self_assignment" : "manager_to_apprentice",
      assigneeName:
        idx % 3 === 0 ? currentUser : idx % 2 === 0 ? "מתלמד/ת א" : "מתלמד/ת ב",
      priority,
      dueDate: new Date(now + Number(daysDelta) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      description,
      createdBy: "מנהל/ת המחקר",
      status,
      thread:
        idx % 4 === 0
          ? [
              {
                id: `${research.id}-thread-${idx + 1}`,
                author: "מנהל/ת המחקר",
                text: "נא לעדכן סטטוס עד סוף היום.",
                createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
              },
            ]
          : [],
      files: [],
      createdAt: new Date(now - idx * 3 * 60 * 60 * 1000).toISOString(),
    }),
  );
}
