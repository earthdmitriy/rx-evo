import { inject, Injectable } from '@angular/core';
import { faker } from '@faker-js/faker';
import { firstValueFrom, Observable, of } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../app.config';
import { clientCount } from '../consts';
import { EventBusService } from '../EventBus.service';
import { mapToError, randomDelay } from '../utils';

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

  public searchClients$({
    email = '',
    name = '',
    registeredBefore,
    registeredAfter,
    page = 1,
    pageSize = 10,
  }: {
    name?: string;
    email?: string;
    registeredBefore?: Date;
    registeredAfter?: Date;
    page?: number;
    pageSize?: number;
  }): Observable<{ data: Client[]; page: number; totalPages: number }> {
    const results = Object.values(this.cachedClients).filter((client) =>
      name
        ? client.name.toLowerCase().includes(name.toLowerCase())
        : true && email
          ? client.email.toLowerCase().includes(email.toLowerCase())
          : true && registeredBefore
            ? client.registeredAt < registeredBefore
            : true && registeredAfter
              ? client.registeredAt > registeredAfter
              : true,
    );

    const totalPages = Math.ceil(results.length / pageSize);
    if (page > totalPages) {
      page = totalPages;
    }
    if (page < 1) {
      page = 1;
    }

    const pagedResults = results.slice((page - 1) * pageSize, page * pageSize);
    return of({ data: pagedResults, page, totalPages }).pipe(
      randomDelay(this.skipDelay, this.logKey),
      mapToError(this.throwError$),
    );
  }
}
