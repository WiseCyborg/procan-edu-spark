/**
 * Convert markdown text to HTML
 * Handles common markdown syntax for course content
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Convert bold text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert italic text
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Convert bullet lists - mark them for processing
  html = html.replace(/^\- (.+)$/gim, '<li>$1</li>');
  
  // Convert numbered lists - mark them for processing
  html = html.replace(/^\d+\. (.+)$/gim, '<li-num>$1</li-num>');

  // Group consecutive list items into lists
  const lines = html.split('\n');
  const paragraphs: string[] = [];
  let currentParagraph = '';
  let inUnorderedList = false;
  let inOrderedList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Handle list items
    if (trimmed.startsWith('<li>')) {
      // Close current paragraph if exists
      if (currentParagraph) {
        paragraphs.push(`<p>${currentParagraph}</p>`);
        currentParagraph = '';
      }
      // Open unordered list if not in one
      if (!inUnorderedList) {
        if (inOrderedList) {
          paragraphs.push('</ol>');
          inOrderedList = false;
        }
        paragraphs.push('<ul>');
        inUnorderedList = true;
      }
      paragraphs.push(trimmed);
    } else if (trimmed.startsWith('<li-num>')) {
      // Close current paragraph if exists
      if (currentParagraph) {
        paragraphs.push(`<p>${currentParagraph}</p>`);
        currentParagraph = '';
      }
      // Open ordered list if not in one
      if (!inOrderedList) {
        if (inUnorderedList) {
          paragraphs.push('</ul>');
          inUnorderedList = false;
        }
        paragraphs.push('<ol>');
        inOrderedList = true;
      }
      // Convert to regular list item
      paragraphs.push(trimmed.replace('<li-num>', '<li>').replace('</li-num>', '</li>'));
    } else if (trimmed.match(/^<[^>]+>/)) {
      // Close any open lists
      if (inUnorderedList) {
        paragraphs.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        paragraphs.push('</ol>');
        inOrderedList = false;
      }
      // Close paragraph if exists
      if (currentParagraph) {
        paragraphs.push(`<p>${currentParagraph}</p>`);
        currentParagraph = '';
      }
      paragraphs.push(trimmed);
    } else if (trimmed === '') {
      // Close any open lists
      if (inUnorderedList) {
        paragraphs.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        paragraphs.push('</ol>');
        inOrderedList = false;
      }
      // Close paragraph if exists
      if (currentParagraph) {
        paragraphs.push(`<p>${currentParagraph}</p>`);
        currentParagraph = '';
      }
    } else {
      // Close any open lists
      if (inUnorderedList) {
        paragraphs.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        paragraphs.push('</ol>');
        inOrderedList = false;
      }
      currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
    }
  }

  // Close any remaining open elements
  if (inUnorderedList) {
    paragraphs.push('</ul>');
  }
  if (inOrderedList) {
    paragraphs.push('</ol>');
  }
  if (currentParagraph) {
    paragraphs.push(`<p>${currentParagraph}</p>`);
  }

  return paragraphs.join('\n');
}
