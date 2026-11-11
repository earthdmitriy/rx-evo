import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { Note } from '../console.types';

/** Internal notes on a customer, visible to support only. */
@Injectable({ providedIn: 'root' })
export class NotesApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Newest first. */
  public notes(customerId: number): Observable<Note[]> {
    return this.http.read('notes', customerId, 'user', () =>
      this.backend.notes(customerId),
    );
  }

  /** Returns the created note. 400 for an empty text. */
  public addNote(customerId: number, text: string): Observable<Note> {
    return this.http.write('addNote', customerId, 'user', () =>
      this.backend.addNote(customerId, text),
    );
  }
}
