import {
  MonoTypeOperatorFunction,
  Observable,
  Subject,
  Subscription,
} from 'rxjs';

export const publishWhile =
  <T>(
    active$: Observable<boolean>,
    options?: { bufferSize?: number; refCount?: boolean },
  ): MonoTypeOperatorFunction<T> =>
  (source: Observable<T>): Observable<T> => {
    const { bufferSize = 1, refCount = true } = options ?? {};
    const subject = new Subject<T>();
    const buffer: T[] = [];

    let activeSubscribers = 0;

    let sourceSubscription: Subscription | null = null;

    const subscribeToSource = () => {
      sourceSubscription?.unsubscribe();
      sourceSubscription = source.subscribe({
        next(value: T) {
          buffer.push(value);
          // remove outdated data
          if (buffer.length > bufferSize) {
            buffer.shift();
          }
          subject.next(value);
        },
        error(err: unknown) {
          subject.error(err);
        },
        complete() {
          subject.complete();
        },
      });
    };
    const subscribeToAvailability = () => {
      availabilitySubscription?.unsubscribe();
      availabilitySubscription = active$.subscribe((available) => {
        if (available) {
          subscribeToSource();
        } else {
          buffer.shift();
          sourceSubscription?.unsubscribe();
        }
      });
    };

    let availabilitySubscription: Subscription | null = null;
    // return Observable, that share data
    return new Observable<T>((subscriber) => {
      activeSubscribers++;
      const innerSubscription: Subscription = subject.subscribe(subscriber);
      if (!availabilitySubscription) {
        subscribeToAvailability();
      } else {
        // send value from buffer to new subscriber
        buffer.forEach((value) => subscriber.next(value));
      }

      // return unsubscribe function
      return () => {
        activeSubscribers--;
        innerSubscription.unsubscribe();
        if (!activeSubscribers && refCount) {
          sourceSubscription?.unsubscribe();
          availabilitySubscription?.unsubscribe();
          sourceSubscription = null;
          availabilitySubscription = null;
          buffer.shift();
        }
      };
    });
  };
