import { inject, Injectable } from '@angular/core';
import { faker } from '@faker-js/faker';
import { firstValueFrom, Observable, of } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../app.config';
import { clientCount } from './consts';
import { EventBusService } from './EventBus.service';
import { mapToError, randomDelay } from './utils';

export type Client = {
  clientId: number;
  name: string;
  email: string;
  avatar: string;
  password: string;
  birthdate: Date;
  registeredAt: Date;
};

const createClient = (id: number) => ({
  clientId: id,
  name: faker.internet.userName(),
  email: faker.internet.email(),
  avatar: faker.image.avatar(),
  password: faker.internet.password(),
  birthdate: faker.date.birthdate(),
  registeredAt: faker.date.past(),
});

@Injectable({
  providedIn: 'root',
})
export class ClientApiService {
  private readonly logKey = 'client';
  private readonly skipDelay = inject(SKIPDELAY_TOKEN);
  private readonly throwError$ = inject(EventBusService).throwClientApiError$;

  private readonly cachedClients: { [id: number]: Client } = new Array(
    clientCount,
  )
    .fill(0)
    .map((_, idx) => createClient(idx))
    .reduce(
      (acc, client) => ((acc[client.clientId] = client), acc),
      {} as { [id: number]: Client },
    );

  public getClient$(id: number): Observable<Client> {
    const cached =
      this.cachedClients[id] ?? (this.cachedClients[id] = createClient(id));
    return of(cached).pipe(
      randomDelay(this.skipDelay, this.logKey, id),
      mapToError(this.throwError$),
    );
  }

  public getClientProm(id: number) {
    return firstValueFrom(this.getClient$(id));
  }

  public allClients$() {
    return of(
      Object.keys(this.cachedClients).map((id) => this.cachedClients[+id]),
    ).pipe(
      randomDelay(this.skipDelay, this.logKey),
      mapToError(this.throwError$),
    );
  }
}
