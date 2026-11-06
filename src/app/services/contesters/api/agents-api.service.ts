import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FakeBackend } from '../backend/fake-backend.service';
import { FakeTransport } from '../backend/fake-transport.service';
import { AgentRef } from '../console.types';

/** The agent directory: names of agents referenced by id (message and note authors). */
@Injectable({ providedIn: 'root' })
export class AgentsApi {
  private readonly http = inject(FakeTransport);
  private readonly backend = inject(FakeBackend);

  /** Up to `MAX_BATCH` agent ids per call (400 above). */
  public agents(agentIds: number[]): Observable<AgentRef[]> {
    return this.http.read('agents', agentIds, 'user', () => this.backend.agents(agentIds));
  }
}
