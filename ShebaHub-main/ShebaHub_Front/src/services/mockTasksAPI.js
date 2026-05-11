// Mock Tasks API for Task Manager

export const mockTasks = [
  {
    id: "task_1",
    title: "לנתח נתוני MRI חדשים",
    researchId: "res_1",
    researchName: "מחקר הדמיית מוח",
    assignees: [
      { id: "u1", name: "Dr. David", role: "role filler", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
      { id: "u2", name: "student David", role: "role filler", avatar: "https://randomuser.me/api/portraits/men/46.jpg" }
    ],
    urgency: "medium", // 'low' | 'medium' | 'high'
    dueDate: "2023-10-12",
    status: "in_progress", // 'todo' | 'in_progress' | 'needs_help' | 'completed'
    commentsCount: 2,
    description: "יש לבדוק את תוצאות סריקות ה-MRI החדשות שהתקבלו מבית החולים, לסווג אותן לפי חומרת הממצאים ולהעלות דוח ניתוח מפורט.",
    attachments: [
      { id: "att1", name: "MRI_Report_v1.pdf", size: "2.5 MB", url: "#" },
      { id: "att2", name: "scan_001.dcm", size: "14.2 MB", url: "#" }
    ]
  },
  {
    id: "task_2",
    title: "להשלים הגשת IRB",
    researchId: "res_2",
    researchName: "מחקר קליני: השפעות תזונה",
    assignees: [
      { id: "me", name: "student Sarah", role: "self", avatar: "https://randomuser.me/api/portraits/women/44.jpg" }
    ],
    urgency: "high",
    dueDate: "2023-10-15",
    status: "needs_help",
    commentsCount: 2,
    description: "השלמת מסמכי הבהרה לוועדת הלסינקי (IRB). חסרות חתימות של חלק מהחוקרים ויש לעדכן את פרוטוקול המחקר בהתאם להערות שקיבלנו.",
    attachments: [
      { id: "att3", name: "IRB_Feedback.docx", size: "450 KB", url: "#" }
    ]
  },
  {
    id: "task_3",
    title: "לערוך סקר ספרות",
    researchId: "res_1",
    researchName: "מחקר הדמיית מוח",
    assignees: [
      { id: "u3", name: "Prof. Chen", role: "manager", avatar: "https://randomuser.me/api/portraits/men/50.jpg" },
      { id: "u2", name: "student david", role: "student", avatar: "https://randomuser.me/api/portraits/men/46.jpg" }
    ],
    urgency: "low",
    dueDate: "2023-10-20",
    status: "completed",
    commentsCount: 0,
    description: "סקירת מאמרים אקדמיים עדכניים בנושא הדמיית מוח ורשתות עצביות. יש לסכם לפחות 10 מקורות מרכזיים מהשנתיים האחרונות.",
    attachments: []
  }
];

export const mockComments = {
  "task_2": [
    {
      id: "c1",
      author: { id: "me", name: "Sarah L", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
      body: "זקוקה לעזרתך, הפורמט השתנה?",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago roughly
      timeString: "12:35 AM"
    },
    {
      id: "c2",
      author: { id: "u1", name: "David K", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
      body: "הסתכלי בתיקיית העדכונים. אבדוק מאוחר יותר.",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
      timeString: "12:33 AM"
    }
  ]
};

export const taskAPI = {
  getTasks: async () => {
    return new Promise((resolve) => setTimeout(() => resolve(mockTasks), 300));
  },
  getComments: async (taskId) => {
    return new Promise((resolve) => setTimeout(() => resolve(mockComments[taskId] || []), 200));
  },
  addComment: async (taskId, body, user) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newComment = {
          id: `c_${Date.now()}`,
          author: {
            id: user?.id || "me",
            name: user?.first_name ? `${user.first_name} ${user.last_name}` : "Me",
            avatar: user?.profile_picture || "https://randomuser.me/api/portraits/lego/1.jpg"
          },
          body,
          createdAt: new Date().toISOString(),
          timeString: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute:'2-digit' })
        };
        if (!mockComments[taskId]) {
          mockComments[taskId] = [];
        }
        mockComments[taskId].push(newComment);
        
        // Update task comment count
        const task = mockTasks.find(t => t.id === taskId);
        if (task) task.commentsCount += 1;
        
        resolve(newComment);
      }, 300);
    });
  }
};
