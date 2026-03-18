export function scrollToFirstError(errors) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  // First try by name for standard inputs
  let el = document.getElementsByName(firstKey)[0];
  // Fallback to id for custom fields
  if (!el) {
    el = document.getElementById(`field-${firstKey}`);
  }
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

const ALLOWED_CONTRACT_EXTENSIONS = ['.pdf'];

export function validateFile(file, { type = 'document' } = {}) {
  if (!file) return null;

  // לוגיקה חדשה: אם הסוג הוא contract, נאפשר רק PDF
  let allowedExts;
  if (type === 'contract') {
    allowedExts = ALLOWED_CONTRACT_EXTENSIONS;
  } else {
    allowedExts = type === 'image' ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_DOC_EXTENSIONS;
  }
  
  const maxSizeMB = type === 'image' ? MAX_IMAGE_SIZE_MB : MAX_DOC_SIZE_MB;

  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExts.includes(ext)) {
    // הודעת שגיאה מותאמת אישית לחוזה
    if (type === 'contract') return `יש להעלות קובץ PDF בלבד`;
    return `סוג קובץ לא מורשה. סוגים מותרים: ${allowedExts.join(', ')}`;
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return `הקובץ גדול מדי (${sizeMB.toFixed(1)} MB). גודל מקסימלי: ${maxSizeMB} MB`;
  }

  return null;
}