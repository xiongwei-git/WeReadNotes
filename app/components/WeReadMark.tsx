export function WeReadMark() {
  return (
    <span className="wordmark-mark" aria-hidden="true">
      <svg
        className="wordmark-symbol"
        viewBox="0 0 40 40"
        fill="none"
        focusable="false"
      >
        <path
          className="wordmark-book"
          d="M7.75 11.75C12.3 11.2 16.5 12.7 20 15.9C23.5 12.7 27.7 11.2 32.25 11.75V26.85C27.7 26.2 23.6 27.7 20 31C16.4 27.7 12.3 26.2 7.75 26.85V11.75Z"
        />
        <path className="wordmark-spine" d="M20 15.9V31" />
        <path
          className="wordmark-page-lines"
          d="M11.5 16.2C13.55 16.3 15.45 16.9 17.05 18M28.5 16.2C26.45 16.3 24.55 16.9 22.95 18"
        />
      </svg>
    </span>
  );
}
