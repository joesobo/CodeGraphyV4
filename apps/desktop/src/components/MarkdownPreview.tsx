import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MARKDOWN_PREVIEW_CHARACTER_LIMIT = 100_000;

const embeddedImagePattern = /^data:image\/(?:avif|gif|jpeg|png|webp);base64,/i;

const markdownComponents: Components = {
  ['a']: ({ children, href, ...props }) => (
    <span
      {...props}
      className="markdown-preview-link"
      title={href ? `${href} (preview only)` : 'Preview link destination unavailable'}
    >
      {children}
    </span>
  ),
  ['img']: ({ alt, src }) => typeof src === 'string' && embeddedImagePattern.test(src)
    ? <img alt={alt ?? ''} src={src} />
    : (
        <span
          className="markdown-preview-image-placeholder"
          title={src ? `Local image preview is not available yet: ${src}` : undefined}
        >
          {alt ? `Image: ${alt}` : 'Image preview is not available yet'}
        </span>
      ),
};

export function MarkdownPreview({ content }: { content: string }): React.ReactElement {
  if (content.length > MARKDOWN_PREVIEW_CHARACTER_LIMIT) {
    return (
      <div className="markdown-preview-limit" role="status">
        Preview is disabled for Markdown Files over 100,000 characters to keep editing responsive.
      </div>
    );
  }

  return (
    <article aria-label="Markdown preview" className="markdown-preview">
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
