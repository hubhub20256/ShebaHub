export function scrollToFirstError(errors) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  const el = document.getElementsByName(firstKey)[0];
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus();
  }
}

export function mapServerErrors(errorData) {
  const fieldErrors = errorData?.details || errorData;
  const mapped = {};
  for (const [key, val] of Object.entries(fieldErrors || {})) {
    mapped[key] = Array.isArray(val) ? val[0] : val;
  }
  return mapped;
}

const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_DOC_SIZE_MB = 10;
const MAX_IMAGE_SIZE_MB = 5;

export function validateFile(file, { type = 'document' } = {}) {
  if (!file) return null;

  const allowedExts = type === 'image' ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_DOC_EXTENSIONS;
  const maxSizeMB = type === 'image' ? MAX_IMAGE_SIZE_MB : MAX_DOC_SIZE_MB;

  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExts.includes(ext)) {
    return `סוג קובץ לא מורשה. סוגים מותרים: ${allowedExts.join(', ')}`;
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return `הקובץ גדול מדי (${sizeMB.toFixed(1)} MB). גודל מקסימלי: ${maxSizeMB} MB`;
  }

  return null;
}
