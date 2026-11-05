import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { faker } from '@faker-js/faker';
import { filter, map } from 'rxjs';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { StatefulBlockComponent } from '../../content/stateful-block/stateful-block.component';
import {
  loggedInToken,
  profileBucketToken,
  profileToken,
} from './session.tokens';

@Component({
  selector: 'app-login-logout',
  imports: [
    AsyncPipe,
    StatefulBlockComponent,
    ClientInfoComponent,
    ClientBucketComponent,
  ],
  templateUrl: './login-logout.component.html',
  styleUrl: './login-logout.component.less',
})
export class LoginLogoutComponent {
  public readonly loggedIn$ = inject(loggedInToken);
  public readonly profile = inject(profileToken);
  public readonly profileBucket = inject(profileBucketToken);

  /** Fresh random credentials for every logged-out state. */
  public readonly credentials$ = this.loggedIn$.pipe(
    filter((loggedIn) => !loggedIn),
    map(() => ({
      email: faker.internet.email(),
      password: faker.internet.password(),
    })),
  );
}
