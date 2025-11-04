import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content for safe rendering
 * Used for admin-managed content (courses, emails)
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'strong', 'em', 'u', 's', 'mark',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'code', 'pre',
      'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 
      'class', 'id',
      'target', 'rel',
      'width', 'height'
    ],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:)/i,
    ALLOW_DATA_ATTR: false
  });
};
