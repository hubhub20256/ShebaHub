import { apiRequest } from "./api";

const TASKS = "/research/tasks/";

/**
 * Task API adapter used by the TaskManager page.
 *
 * This module keeps the page-facing contract stable by normalizing task and
 * assignee identifiers, translating camelCase and snake_case date fields, and
 * preserving multipart upload support for file attachments.
 */

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

/**
 * Normalizes assignee ids so the UI can compare and render them consistently.
 */
const normalizeAssignee = (assignee) => {
  if (!assignee || typeof assignee !== "object") return assignee;
  return {
    ...assignee,
    id: assignee.id != null ? String(assignee.id) : "",
  };
};

/**
 * Normalizes task payloads returned by the API into the shape expected by the UI.
 */
const normalizeTask = (task) => {
  if (!task || typeof task !== "object") return task;

  const dueDate = task.dueDate ?? task.due_date ?? null;

  return {
    ...task,
    dueDate,
    researchId:
      task.researchId != null
        ? String(task.researchId)
        : task.research_id != null
          ? String(task.research_id)
          : "",
    assignees: Array.isArray(task.assignees)
      ? task.assignees.map(normalizeAssignee)
      : [],
  };
};

const normalizeDueDateValue = (value) => (value === "" ? null : value);

/**
 * Keeps outbound payloads aligned with backend field names and null semantics.
 */
const normalizeOutboundPayload = (payload = {}) => {
  if (!payload || typeof payload !== "object") return payload;

  const normalized = { ...payload };

  if (Object.prototype.hasOwnProperty.call(normalized, "dueDate")) {
    const nextDueDate = normalizeDueDateValue(normalized.dueDate);
    normalized.dueDate = nextDueDate;
    normalized.due_date = nextDueDate;
    return normalized;
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "due_date")) {
    normalized.due_date = normalizeDueDateValue(normalized.due_date);
  }

  return normalized;
};

/**
 * Lists tasks for the active board scope and returns normalized task records.
 */
export const listTasks = async (params = {}) => {
  const data = await apiRequest(`${TASKS}${buildQueryString(params)}`);
  return Array.isArray(data) ? data.map(normalizeTask) : [];
};

/**
 * Creates a task and optionally uploads attachments in the same request.
 */
export const createTask = async (payload, files = []) => {
  const normalizedPayload = normalizeOutboundPayload(payload);

  if (!files.length) {
    const created = await apiRequest(TASKS, {
      method: "POST",
      body: normalizedPayload,
    });
    return normalizeTask(created);
  }

  const fd = new FormData();
  Object.entries(normalizedPayload || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "object") {
      fd.append(k, JSON.stringify(v));
      return;
    }
    fd.append(k, String(v));
  });
  files.forEach((f) => fd.append("files", f));

  const created = await apiRequest(TASKS, {
    method: "POST",
    body: fd,
    isFormData: true,
  });

  return normalizeTask(created);
};

/**
 * Fetches a single task and normalizes the server response shape.
 */
export const getTask = async (id) => {
  const task = await apiRequest(`${TASKS}${id}/`);
  return normalizeTask(task);
};

/**
 * Applies a partial task update while preserving normalized field names.
 */
export const updateTask = async (id, patch) => {
  const normalizedPatch = normalizeOutboundPayload(patch);

  const updated = await apiRequest(`${TASKS}${id}/`, {
    method: "PATCH",
    body: normalizedPatch,
  });
  return normalizeTask(updated);
};

/**
 * Deletes a task and resolves to a simple success flag for caller convenience.
 */
export const deleteTask = async (id) => {
  await apiRequest(`${TASKS}${id}/`, { method: "DELETE" });
  return true;
};

/**
 * Assigns a user to a task and normalizes the returned assignee record.
 */
export const assignUser = async (taskId, userId, role = "") => {
  const assignee = await apiRequest(`${TASKS}${taskId}/assignees/`, {
    method: "POST",
    body: { user_id: userId, role },
  });
  return normalizeAssignee(assignee);
};

/**
 * Removes a task assignee and resolves to a simple success flag.
 */
export const unassignUser = async (taskId, userId) => {
  await apiRequest(`${TASKS}${taskId}/assignees/${userId}/`, {
    method: "DELETE",
  });
  return true;
};

/**
 * Returns the task comments list without altering the server ordering.
 */
export const listComments = async (taskId) => {
  const comments = await apiRequest(`${TASKS}${taskId}/comments/`);
  return Array.isArray(comments) ? comments : [];
};

/**
 * Creates a comment for a task and returns the server response directly.
 */
export const addComment = async (taskId, body) => {
  return apiRequest(`${TASKS}${taskId}/comments/`, {
    method: "POST",
    body: { body },
  });
};

/**
 * Deletes a comment and resolves to a simple success flag.
 */
export const deleteComment = async (taskId, commentId) => {
  await apiRequest(`${TASKS}${taskId}/comments/${commentId}/`, {
    method: "DELETE",
  });
  return true;
};

/**
 * Uploads task attachments using multipart form data and returns normalized items.
 */
export const uploadAttachments = async (taskId, files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));

  const uploaded = await apiRequest(`${TASKS}${taskId}/attachments/`, {
    method: "POST",
    body: fd,
    isFormData: true,
  });

  return Array.isArray(uploaded) ? uploaded : [];
};

/**
 * Deletes a task attachment and resolves to a simple success flag.
 */
export const deleteAttachment = async (taskId, attachmentId) => {
  await apiRequest(`${TASKS}${taskId}/attachments/${attachmentId}/`, {
    method: "DELETE",
  });
  return true;
};
