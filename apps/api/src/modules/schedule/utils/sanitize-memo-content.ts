import sanitizeHtml from 'sanitize-html';

const SAFE_TAGS = [
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const SAFE_ATTR: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['style', 'class'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
};

const SAFE_STYLES: sanitizeHtml.IOptions['allowedStyles'] = {
  '*': {
    color: [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(/, /^rgba\(/],
    'background-color': [/^#(0x)?[0-9a-fA-F]+$/, /^rgb\(/, /^rgba\(/],
    'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    'font-family': [/^[\w\s,'"-]+$/],
    'font-size': [/^\d+(\.\d+)?(px|em|rem|%)$/],
    'font-weight': [/^\d+$/, /^bold$/, /^normal$/],
    'font-style': [/^italic$/, /^normal$/],
    'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
    'padding-left': [/^\d+(\.\d+)?(px|em|rem)$/],
    'margin-left': [/^\d+(\.\d+)?(px|em|rem)$/],
  },
};

export function sanitizeMemoHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: SAFE_TAGS,
    allowedAttributes: SAFE_ATTR,
    allowedStyles: SAFE_STYLES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });
}

export function sanitizeMemoContent(
  content: string | undefined,
  format: 'text' | 'html' | undefined,
): string {
  if (!content) return '';
  if (format === 'html') return sanitizeMemoHtml(content);
  return content;
}
