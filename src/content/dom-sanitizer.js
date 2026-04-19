import DOMPurify from "../shared/lib/purify.min.js";

export const sanitizeHtml = (html) => DOMPurify.sanitize(html);
