export const LiveRegion = () => (
  <>
    <div
      id="live-region-polite"
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    />
    <div
      id="live-region-assertive"
      className="sr-only"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    />
  </>
);
