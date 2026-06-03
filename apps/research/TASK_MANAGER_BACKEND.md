# Research Task Manager — Backend Handoff

> Audience: Frontend team integrating `ShebaHub_Front/src/pages/TaskManager.jsx` with the real API.
> Backend app: `ShebaHub_Backend/apps/research/`
> Mount point: all endpoints live under `/api/research/` (see `config/urls.py`).
> Status: **Backend implemented, migration created, system check clean. Frontend was NOT modified — that's the next step.**

---

## 1. Overview of the backend work

The Task Manager feature lets members of a research project create, track, assign, comment on, and attach files to tasks. Before this change the `apps/research` app already had Researches, Applications (with mentor permissions), and a research chat — but **no concept of a task**. We added a complete task layer that reuses the existing membership / permission model so we did not duplicate any access logic.

What was added:

| Layer | Added |
|---|---|
| Models | `ResearchTask`, `ResearchTaskAssignee` (through table), `ResearchTaskAttachment`, `ResearchTaskComment` |
| Serializers | `ResearchTaskSerializer`, `ResearchTaskAssigneeSerializer`, `ResearchTaskAttachmentSerializer`, `ResearchTaskCommentSerializer` + shared helper `_user_avatar_url` |
| Views | 8 new function-based DRF views (full CRUD + assignees + comments + attachments) |
| URLs | 8 new routes under `/api/research/tasks/...` |
| Admin | All 4 new models registered with inlines |
| Migration | `apps/research/migrations/0024_researchtask_researchtaskcomment_and_more.py` |

What was reused (no duplication):

- Auth & permissions: `IsAuthenticated` + `IsEmailVerified` (`apps/common/permissions.py`)
- File security: `validate_upload` and `generate_secure_filename` (`apps.profiles.file_security`)
- Text sanitization: `sanitize_text` (`apps.common.utils`)
- Membership rules: derived from `Research.owner` + `ResearchApplication.status == APPROVED`
- Per-mentor granular permissions: existing `can_edit` flag on `ResearchApplication`
- Validation error format: `{ "code": "VALIDATION_ERROR", "message": ..., "details": ... }` (matches the rest of the app)

What was deliberately **not** changed:

- The frontend (`TaskManager.jsx`, `mockTasksAPI.js`, `services/api.js`) — per requirement.
- Any existing model / serializer / view in `apps/research` — only additive changes.

---

## 2. Data model

### 2.1 `ResearchTask`

A task that lives inside one research project.

| Field | Type | Notes |
|---|---|---|
| `id` | AutoField | PK |
| `research` | FK → `Research` | `on_delete=CASCADE`, `related_name="tasks"` |
| `created_by` | FK → User | `on_delete=SET_NULL`, nullable, `related_name="created_research_tasks"` |
| `title` | CharField(255) | Required, sanitized |
| `description` | TextField | Optional, sanitized, max 5000 chars (serializer) |
| `urgency` | CharField(20) | Enum, default `medium`, indexed |
| `status` | CharField(20) | Enum, default `todo`, indexed |
| `due_date` | DateField | Optional |
| `assignees` | M2M → User through `ResearchTaskAssignee` | |
| `created_at` / `updated_at` | DateTimeField | auto |

Indexes: `(research, status)`, `(research, urgency)`. Default ordering: `-created_at`.

### 2.2 `ResearchTaskAssignee`

Through-table for the assignees M2M, with a free-form display role.

| Field | Type | Notes |
|---|---|---|
| `task` | FK → `ResearchTask` | CASCADE |
| `user` | FK → User | CASCADE |
| `role` | CharField(100) | Free-form, e.g. `"owner"`, `"manager"`, `"student"`. Defaults to `""`. The task creator is auto-added with role `"owner"` on creation if no `assignees` array is supplied. |
| `created_at` | DateTimeField | auto |

Constraint: `UNIQUE(task, user)`.

### 2.3 `ResearchTaskAttachment`

| Field | Type | Notes |
|---|---|---|
| `task` | FK → `ResearchTask` | CASCADE, `related_name="attachments"` |
| `file` | FileField | Stored under `research_tasks/<research_id>/<task_id>/<uuid>.<ext>` |
| `file_name` | CharField(255) | Output of `generate_secure_filename(original_name)` |
| `size` | PositiveBigIntegerField | Raw bytes |
| `uploaded_by` | FK → User | SET_NULL |
| `created_at` | DateTimeField | auto |

### 2.4 `ResearchTaskComment`

| Field | Type | Notes |
|---|---|---|
| `task` | FK → `ResearchTask` | CASCADE, `related_name="comments"` |
| `author` | FK → User | CASCADE |
| `body` | TextField | max 2000 chars, sanitized, non-empty after sanitize |
| `created_at` | DateTimeField | auto |

Default ordering: `created_at` ascending (oldest first — chat order).

---

## 3. Enums

```ts
type TaskStatus = "todo" | "in_progress" | "needs_help" | "completed";
type TaskUrgency = "low" | "medium" | "high";
```

Hebrew display labels are the frontend's responsibility — the backend always speaks the keys above.

---

## 4. Permissions matrix

Membership of a research is defined as: **owner** OR **approved applicant** (`ResearchApplication.status == "approved"`).

| Action | Who can do it |
|---|---|
| **List tasks** | Any authenticated member — only sees tasks across researches they belong to |
| **View task** | Research owner, approved member, or task creator |
| **Create task** | Research owner or approved member |
| **Edit task** (PATCH) | Task creator, research owner, or approved mentor with `can_edit=True` |
| **Delete task** | Same as edit |
| **Assign / unassign** | Same as edit |
| **Read comments** | Same as view |
| **Post comment** | Same as view (any member) |
| **Delete comment** | Comment author, task creator, or research owner |
| **Upload attachment** | Same as edit |
| **Delete attachment** | Same as edit |

When a target task does not exist *or* the user has no read access at all, the API returns **404**, not 403, to avoid leaking task ids. Write-permission failures on a task you can read return **403**.

---

## 5. The canonical Task JSON

This is exactly what every endpoint that returns a task (list, create, get, patch) sends back. It mirrors the shape `TaskManager.jsx` already consumes from `mockTasksAPI.js`, so the frontend should not need to remap fields.

```json
{
  "id": 42,
  "title": "סקירת ספרות",
  "description": "לסיים את פרק 2 עד סוף השבוע",
  "urgency": "high",
  "status": "in_progress",
  "dueDate": "2026-04-20",
  "researchId": "7",
  "researchName": "השפעת AI על אבחון רנטגן",
  "assignees": [
    { "id": "12", "name": "דנה לוי", "role": "owner", "avatar": "https://.../media/avatars/12.png" },
    { "id": "31", "name": "יואב כהן", "role": "student", "avatar": null }
  ],
  "attachments": [
    {
      "id": 5,
      "name": "outline_v2.pdf",
      "size": "2.5 MB",
      "url": "https://.../media/research_tasks/7/42/uuid.pdf",
      "created_at": "2026-04-13T10:14:22Z"
    }
  ],
  "commentsCount": 3,
  "createdBy": { "id": "12", "name": "דנה לוי" },
  "created_at": "2026-04-13T08:00:01Z",
  "updated_at": "2026-04-13T10:14:22Z"
}
```

Field notes:

- `researchId` and `assignees[].id` are **strings** (matches the frontend mock).
- `attachments[].size` is a **human-readable string** (`"2.5 MB"`, `"512 KB"`, `"0 B"`), not a number.
- `dueDate` is `YYYY-MM-DD` or `null`.
- `assignees[].avatar` is an absolute URL or `null`. Resolved from `MentorProfile` first, then `StudentProfile`.
- `createdBy` is `null` if the original creator's account was deleted.

---

## 6. Endpoints

All endpoints require `Authorization: Bearer <jwt>` and a verified email. All paths are prefixed with `/api/research`.

### 6.1 List tasks

`GET /api/research/tasks/`

Lists every task across every research the current user belongs to.

**Query params (all optional):**

| Param | Type | Effect |
|---|---|---|
| `research_id` | int | Restrict to a single research |
| `status` | enum | One of `todo`, `in_progress`, `needs_help`, `completed` |
| `urgency` | enum | One of `low`, `medium`, `high` |
| `q` | string | Case-insensitive substring match against `title` |

**Response 200:** array of Task objects (see §5), newest first.

**Errors:** `400` for unknown `status` / `urgency` / non-numeric `research_id`.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.shebahub.local/api/research/tasks/?research_id=7&status=in_progress"
```

---

### 6.2 Create task

`POST /api/research/tasks/`

Accepts **either** `application/json` **or** `multipart/form-data` (use multipart if you want to upload attachments in the same request).

**Body fields:**

| Field | Required | Notes |
|---|---|---|
| `research_id` *(or `researchId`)* | yes | The research the task belongs to |
| `title` | yes | 1–255 chars, sanitized |
| `description` | no | up to 5000 chars, sanitized |
| `urgency` | no | enum, defaults to `medium` |
| `status` | no | enum, defaults to `todo` |
| `due_date` *(or `dueDate`)* | no | `YYYY-MM-DD` |
| `assignees` | no | JSON array. Each item is either an int user id or `{"id": <user_id>, "role": "<string>"}`. If omitted, the creator is added with role `"owner"`. Any user id that is not a member of the research is silently ignored. |
| `files` | no | Multipart only — repeated `files` field for attachment uploads. |

**Response 201:** the created Task object (full shape from §5).

**Errors:**
- `400 { "code": "VALIDATION_ERROR", "message": "Validation failed.", "details": { ... } }`
- `400 { "detail": "research_id is required." }`
- `400 { "detail": "<file rejection reason>" }`
- `403 { "detail": "אין לך הרשאה ליצור משימה במחקר זה." }`
- `404 { "detail": "Research not found." }`

**Example (JSON, no files):**
```js
await fetch("/api/research/tasks/", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    research_id: 7,
    title: "סקירת ספרות",
    description: "לסיים את פרק 2",
    urgency: "high",
    status: "todo",
    dueDate: "2026-04-20",
    assignees: [{ id: 12, role: "owner" }, { id: 31, role: "student" }],
  }),
});
```

**Example (multipart, with files):**
```js
const fd = new FormData();
fd.append("research_id", "7");
fd.append("title", "סקירת ספרות");
fd.append("urgency", "high");
fd.append("assignees", JSON.stringify([12, 31]));
files.forEach((f) => fd.append("files", f));
await fetch("/api/research/tasks/", {
  method: "POST",
  headers: { "Authorization": `Bearer ${token}` }, // do NOT set Content-Type
  body: fd,
});
```

---

### 6.3 Get / update / delete task

`GET    /api/research/tasks/<task_id>/`
`PATCH  /api/research/tasks/<task_id>/`
`DELETE /api/research/tasks/<task_id>/`

**GET — Response 200:** Task object.

**PATCH — Body:** any subset of `title`, `description`, `urgency`, `status`, `due_date` (or `dueDate`).
**Response 200:** Updated Task object.

**DELETE — Response 204** (no body). Hard-deletes the task and all of its attachments (files removed from storage), comments, and assignees via cascade.

**PATCH example — moving a task between columns (Kanban drag):**
```js
await fetch(`/api/research/tasks/${task.id}/`, {
  method: "PATCH",
  headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ status: "in_progress" }),
});
```

---

### 6.4 Assign / unassign

`POST   /api/research/tasks/<task_id>/assignees/`
`DELETE /api/research/tasks/<task_id>/assignees/<user_id>/`

**POST body:**
```json
{ "user_id": 31, "role": "student" }
```
`role` is optional; `user_id` must be a current member of the research.

**Response 201** (new) or **200** (already assigned, role refreshed):
```json
{ "id": "31", "name": "יואב כהן", "role": "student", "avatar": null }
```

**DELETE — Response 204** if removed, **404** if the user wasn't assigned.

---

### 6.5 Comments

`GET  /api/research/tasks/<task_id>/comments/`
`POST /api/research/tasks/<task_id>/comments/`
`DELETE /api/research/tasks/<task_id>/comments/<comment_id>/`

**GET — Response 200:** array of comments, oldest first:
```json
[
  {
    "id": 11,
    "author": { "id": "12", "name": "דנה לוי", "avatar": "https://.../12.png" },
    "body": "ראיתי את הטיוטה, נראה טוב",
    "createdAt": "2026-04-13T09:01:55Z",
    "timeString": "09:01"
  }
]
```

**POST — Body:**
```json
{ "body": "אעבור על זה היום" }
```
Sanitized; must not be empty after sanitization; max 2000 chars.

**Response 201:** the new comment in the same shape as above.

**DELETE — Response 204.** Allowed for the comment author, the task creator, or the research owner. Otherwise `403`.

---

### 6.6 Attachments (standalone upload + delete)

`POST   /api/research/tasks/<task_id>/attachments/`
`DELETE /api/research/tasks/<task_id>/attachments/<attachment_id>/`

`POST` — `multipart/form-data` with one or more `files` entries.

**Response 201:** array of attachment objects in the same shape as `attachments[]` in §5.

**Errors:**
- `400 { "detail": "יש לצרף לפחות קובץ אחד." }` if no files
- `400 { "detail": "<rejection from validate_upload>" }` for unsafe / oversized files

**DELETE — Response 204.** Removes the row and the underlying file from storage.

---

## 7. Validation rules summary

| Field | Rule |
|---|---|
| `title` | required, 1–255 chars, sanitized via `sanitize_text` |
| `description` | optional, 0–5000 chars, sanitized |
| `urgency` | must be one of `low` / `medium` / `high` |
| `status` | must be one of `todo` / `in_progress` / `needs_help` / `completed` |
| `due_date` | ISO date `YYYY-MM-DD` or null |
| `assignees[].id` | must reference a current research member; non-members are silently dropped on create |
| `comment.body` | sanitized, non-empty after sanitize, ≤2000 chars |
| Attachment file | runs through `apps.profiles.file_security.validate_upload` |

Validation failures use the project-wide envelope:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed.",
  "details": { "title": ["This field is required."] }
}
```

---

## 8. Frontend integration guidance

### 8.1 Replace the mock layer

Today `TaskManager.jsx` imports from `services/mockTasksAPI.js`. Create the matching real implementation in `services/api.js` (or a new `services/tasksAPI.js`). The shapes line up — no field renames should be needed in the JSX.

```js
// ShebaHub_Front/src/services/tasksAPI.js
import api from "./api";

const TASKS = "/api/research/tasks/";

export const listTasks = (params = {}) =>
  api.get(TASKS, { params }).then((r) => r.data);

export const createTask = (payload, files = []) => {
  if (!files.length) {
    return api.post(TASKS, payload).then((r) => r.data);
  }
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    fd.append(k, typeof v === "object" ? JSON.stringify(v) : v);
  });
  files.forEach((f) => fd.append("files", f));
  return api.post(TASKS, fd).then((r) => r.data);
};

export const getTask = (id) => api.get(`${TASKS}${id}/`).then((r) => r.data);
export const updateTask = (id, patch) => api.patch(`${TASKS}${id}/`, patch).then((r) => r.data);
export const deleteTask = (id) => api.delete(`${TASKS}${id}/`).then(() => true);

export const assignUser = (taskId, userId, role = "") =>
  api.post(`${TASKS}${taskId}/assignees/`, { user_id: userId, role }).then((r) => r.data);
export const unassignUser = (taskId, userId) =>
  api.delete(`${TASKS}${taskId}/assignees/${userId}/`).then(() => true);

export const listComments = (taskId) => api.get(`${TASKS}${taskId}/comments/`).then((r) => r.data);
export const addComment = (taskId, body) =>
  api.post(`${TASKS}${taskId}/comments/`, { body }).then((r) => r.data);
export const deleteComment = (taskId, commentId) =>
  api.delete(`${TASKS}${taskId}/comments/${commentId}/`).then(() => true);

export const uploadAttachments = (taskId, files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  return api.post(`${TASKS}${taskId}/attachments/`, fd).then((r) => r.data);
};
export const deleteAttachment = (taskId, attachmentId) =>
  api.delete(`${TASKS}${taskId}/attachments/${attachmentId}/`).then(() => true);
```

### 8.2 Typical UI flows

```js
// Initial board load (filter by current research)
const tasks = await listTasks({ research_id: currentResearchId });

// Drag-and-drop column change
await updateTask(task.id, { status: "in_progress" });

// Inline edit
await updateTask(task.id, { title, description, dueDate });

// Add a member from the assignees popover
await assignUser(task.id, user.id, "student");

// Open the task chat
const comments = await listComments(task.id);
const newComment = await addComment(task.id, draft);

// Upload files from inside an open task
const newAttachments = await uploadAttachments(task.id, fileList);
```

### 8.3 Error handling tips

- Always read `error.response.data.code === "VALIDATION_ERROR"` first; surface `details` next to the offending field.
- A `404` on a known task id usually means the user lost access (e.g. removed from the research) — refresh the board.
- A `403` on PATCH/DELETE means the user is a regular member without `can_edit`. Show "אין הרשאה" rather than letting the request slip through silently.
- For multipart requests **do not** set `Content-Type` manually — let the browser fill in the boundary.

### 8.4 Things the frontend team must do

1. Delete the mock import from `TaskManager.jsx` and switch to the real client above.
2. Wire the assignees popover to actually call `assignUser` / `unassignUser`.
3. Pass the current `researchId` to `listTasks` when scoped to one research; omit it on a global "my tasks" page.
4. Render `attachments[].size` as-is (it's already a formatted string).
5. Treat `assignees[].id` and `researchId` as strings in comparisons.
6. When deleting a task, pre-confirm with the user — the backend hard-deletes everything (attachments, comments, assignees).

---

## 9. URLs reference

```text
GET    /api/research/tasks/
POST   /api/research/tasks/
GET    /api/research/tasks/<task_id>/
PATCH  /api/research/tasks/<task_id>/
DELETE /api/research/tasks/<task_id>/
POST   /api/research/tasks/<task_id>/assignees/
DELETE /api/research/tasks/<task_id>/assignees/<user_id>/
GET    /api/research/tasks/<task_id>/comments/
POST   /api/research/tasks/<task_id>/comments/
DELETE /api/research/tasks/<task_id>/comments/<comment_id>/
POST   /api/research/tasks/<task_id>/attachments/
DELETE /api/research/tasks/<task_id>/attachments/<attachment_id>/
```

OpenAPI / Swagger entries are auto-generated by drf-spectacular — they appear in the existing `/api/schema/` and Swagger UI.

---

## 10. Open questions / what still needs to be done

These are intentionally **not** implemented because they need a product decision.

1. **Notifications.** Should assigning a user, mentioning them in a comment, or being added to a task generate a `ContactMessage` / inbox entry? Infrastructure (`ContactMessage.NotificationType`) already exists.
2. **Last-seen tracking for task chat.** The research chat uses `last_seen_chat_message_id` to power unread badges. Same pattern can be added per task if needed.
3. **Raw byte size for attachments.** Currently `attachments[].size` is the human-readable string `"2.5 MB"`. If the frontend also wants `sizeBytes`, easy to add.
4. **Allowed file types / max size.** Currently relies on the shared `validate_upload`. If the Task Manager needs a stricter or looser policy, override per-call.
5. **Activity log / audit trail.** Not implemented.
6. **Bulk operations.** No bulk-update endpoint right now.
7. **Reordering / Kanban position field.** Frontend currently sorts by `created_at`. Add a `position` integer + reorder endpoint if drag-to-reorder is needed.
8. **Soft delete.** Tasks are hard-deleted today.

---

## 11. Known invariants the frontend can rely on

- A task always belongs to exactly one research; `researchId` never changes after creation.
- The task's research is guaranteed to be one the current user has access to — if they lose access, the task disappears from `listTasks` and any direct fetch will 404.
- The creator is *always* in `assignees` on creation unless the client explicitly passed an `assignees` array.
- Comments are always returned oldest-first; attachments in upload order; tasks newest-first.
- All datetimes are ISO 8601 in UTC (`...Z`). Convert to local time on the frontend.
- The same `Task` object shape is returned by every task-returning endpoint.
