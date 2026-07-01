export function GoogleIcon({
  className = 'h-4 w-4',
}: {
  className?: string;
}): React.ReactElement {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M21.54 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.34a4.56 4.56 0 0 1-1.98 2.99v2.48h3.2c1.87-1.72 2.98-4.26 2.98-7.46Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.2-2.48c-.89.6-2.03.95-3.41.95-2.61 0-4.82-1.76-5.61-4.13H3.08v2.56A9.99 9.99 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.39 13.91A6 6 0 0 1 6.07 12c0-.66.11-1.3.32-1.91V7.53H3.08A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.08 4.47l3.31-2.56Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.96c1.47 0 2.78.5 3.82 1.49l2.86-2.86C16.95 2.98 14.7 2 12 2a9.99 9.99 0 0 0-8.92 5.53l3.31 2.56C7.18 7.72 9.39 5.96 12 5.96Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GitHubIcon({
  className = 'h-4 w-4',
}: {
  className?: string;
}): React.ReactElement {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.14c-3.22.7-3.9-1.37-3.9-1.37-.53-1.35-1.3-1.71-1.3-1.71-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.41-1.27.74-1.56-2.57-.29-5.28-1.29-5.28-5.73 0-1.27.45-2.3 1.2-3.11-.12-.29-.52-1.47.11-3.07 0 0 .98-.31 3.19 1.19a11.04 11.04 0 0 1 5.82 0c2.21-1.5 3.18-1.19 3.18-1.19.64 1.6.24 2.78.12 3.07.75.81 1.2 1.84 1.2 3.11 0 4.45-2.71 5.43-5.29 5.72.42.36.8 1.08.8 2.18v3.24c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function VsCodeIcon({
  className = 'h-4 w-4',
}: {
  className?: string;
}): React.ReactElement {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M17.6 3.2 8.8 11.1 3.4 7 2 8.2l4.7 3.8L2 15.8 3.4 17l5.4-4.1 8.8 7.9 4.4-1.8V5l-4.4-1.8Zm-.2 5.4v6.8L12.1 12l5.3-3.4Z"
        fill="currentColor"
      />
    </svg>
  );
}
