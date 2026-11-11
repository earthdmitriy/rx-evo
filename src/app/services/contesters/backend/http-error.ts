import { HttpErrorResponse } from '@angular/common/http';

/** The fake backend fails like a real one: an `HttpErrorResponse` with a status and a message body. */
export const httpError = (status: number, message: string, endpoint: string) =>
  new HttpErrorResponse({
    status,
    statusText: message,
    url: `/api/${endpoint}`,
    error: { message },
  });

/** A deep copy of plain JSON data: responses never share objects with the backend's tables. */
export const copyJson = <T>(value: T): T =>
  value === undefined ? value : JSON.parse(JSON.stringify(value));
