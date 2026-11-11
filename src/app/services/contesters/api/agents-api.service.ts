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

  /** One agent per call (the directory has no batch endpoint). 404 for an unknown id. */
  public agent(agentId: number): Observable<AgentRef> {
    return this.http.read('agent', agentId, 'user', () =>
      this.backend.agent(agentId),
    );
  }
}
