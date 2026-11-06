import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  input,
  Output,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

/** User-facing text per HTTP status (the fake APIs never produce these). */
const httpStatusText = (status: number): string => {
  if (status === 0)
    return 'The server cannot be reached. Check your connection.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have access to this data.';
  if (status === 404) return 'The requested data was not found.';
  if (status === 408 || status === 504)
    return 'The server took too long to respond.';
  if (status === 409)
    return 'The data was changed by someone else. Reload and try again.';
  if (status === 429)
    return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return `The server failed to respond (${status}).`;
  if (status >= 400) return `The request was rejected (${status}).`;
  return '';
};

/** A message the server sent in the response body, if any. */
const serverMessage = (body: unknown): string =>
  typeof body === 'string'
    ? body
    : typeof body === 'object' && body !== null && 'message' in body
      ? String((body as { message: unknown }).message)
      : '';

/** `HttpErrorResponse`, or any error object carrying a numeric `status` (e.g. from fetch wrappers). */
const isHttpError = (
  error: unknown,
): error is { status: number; error?: unknown } =>
  error instanceof HttpErrorResponse ||
  (typeof error === 'object' &&
    error !== null &&
    typeof (error as { status?: unknown }).status === 'number');

/**
 * Readable message of an error value: an HTTP error (by status, with the
 * server's message when it sends one), a string, an `Error`, or a tuple from
 * a combined stream (one entry per source, `false` for sources that did not
 * fail), possibly nested.
 */
const messageOf = (error: unknown): string => {
  if (isHttpError(error)) {
    const text = httpStatusText(error.status);
    const detail = serverMessage(error.error);
    return detail && detail !== text ? `${text} ${detail}`.trim() : text;
  }
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (Array.isArray(error))
    return error.map(messageOf).filter(Boolean).join(' · ');
  return '';
};

@Component({
  selector: 'app-generic-error',
  templateUrl: './generic-error.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericErrorComponent {
  /** Explicit message; wins over `error`. */
  public readonly text = input<string>('');
  /** Raw error value; parsed into a message here. */
  public readonly error = input<unknown>();

  public readonly showReload = input<boolean>(false);

  @Output() public readonly reload = new EventEmitter<void>();

  protected readonly message = computed(
    () => this.text() || messageOf(this.error()),
  );
}
