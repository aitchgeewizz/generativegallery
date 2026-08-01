/**
 * Combine a per-request timeout with an optional caller-supplied abort
 * signal (e.g. React effect cleanup). Falls back gracefully where
 * AbortSignal.any isn't available: the caller's signal wins and the
 * timeout is dropped, which only ever errs toward patience.
 */
/** True when an error is the by-design result of an aborted fetch —
    cleanup, not failure. Callers should stay quiet about these.
    (TimeoutError is deliberately NOT included: a museum API timing
    out is a real failure worth seeing in the console.) */
export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const combineSignals = (timeoutMs: number, signal?: AbortSignal): AbortSignal => {
  if (!signal) return AbortSignal.timeout(timeoutMs);
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  }
  return signal;
};
