import { apiRequest } from "./api";

const TASKS = "/research/tasks/";

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

const normalizeAssignee = (assignee) => {
  if (!assignee || typeof assignee !== "object") return assignee;
  return {
    ...assignee,
    id: assignee.id != null ? String(assignee.id) : "",
  };
};

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

export const listTasks = async (params = {}) => {
  const data = await apiRequest(`${TASKS}${buildQueryString(params)}`);
  return Array.isArray(data) ? data.map(normalizeTask) : [];
};

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

export const getTask = async (id) => {
  const task = await apiRequest(`${TASKS}${id}/`);
  return normalizeTask(task);
};

export const updateTask = async (id, patch) => {
  const normalizedPatch = normalizeOutboundPayload(patch);

  const updated = await apiRequest(`${TASKS}${id}/`, {
    method: "PATCH",
    body: normalizedPatch,
  });
  return normalizeTask(updated);
};

export const deleteTask = async (id) => {
  await apiRequest(`${TASKS}${id}/`, { method: "DELETE" });
  return true;
};

export const assignUser = async (taskId, userId, role = "") => {
  const assignee = await apiRequest(`${TASKS}${taskId}/assignees/`, {
    method: "POST",
    body: { user_id: userId, role },
  });
  return normalizeAssignee(assignee);
};

export const unassignUser = async (taskId, userId) => {
  await apiRequest(`${TASKS}${taskId}/assignees/${userId}/`, {
    method: "DELETE",
  });
  return true;
};

export const listComments = async (taskId) => {
  const comments = await apiRequest(`${TASKS}${taskId}/comments/`);
  return Array.isArray(comments) ? comments : [];
};

export const addComment = async (taskId, body) => {
  return apiRequest(`${TASKS}${taskId}/comments/`, {
    method: "POST",
    body: { body },
  });
};

export const deleteComment = async (taskId, commentId) => {
  await apiRequest(`${TASKS}${taskId}/comments/${commentId}/`, {
    method: "DELETE",
  });
  return true;
};

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

export const deleteAttachment = async (taskId, attachmentId) => {
  await apiRequest(`${TASKS}${taskId}/attachments/${attachmentId}/`, {
    method: "DELETE",
  });
  return true;
};
