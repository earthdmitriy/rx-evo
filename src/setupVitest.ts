/**
 * Vitest setup (see `test` target in angular.json).
 *
 * zone.js/testing is loaded as a polyfill by the Angular test builder, but it only patches the
 * jasmine / jest / mocha globals, not Vitest's. Angular's `fakeAsync` / `tick` need the test body
 * to run inside a `ProxyZone`, so the Vitest globals are wrapped here the same way
 * zone.js/testing wraps `it` / `beforeEach` for Jest.
 */
type AnyFn = (...args: any[]) => any;

const g = globalThis as any;
const ProxyZoneSpec = g.Zone?.['ProxyZoneSpec'];

if (ProxyZoneSpec) {
  const ambientZone: Zone = g.Zone.current;
  let testProxyZone: Zone = ambientZone.fork(new ProxyZoneSpec());

  const inProxyZone = (fn: AnyFn | undefined): AnyFn | undefined =>
    fn &&
    function (this: unknown, ...args: any[]) {
      return testProxyZone.run(fn, this, args);
    };

  // The wrapped callback keeps the original arity (Vitest rejects the `done` style, so it is 0).
  const wrapTestFn = (original: AnyFn): AnyFn => {
    const wrapped: AnyFn = function (
      this: unknown,
      name: unknown,
      fn?: AnyFn,
      ...rest: any[]
    ) {
      return original.call(
        this,
        name,
        typeof fn === 'function' ? inProxyZone(fn) : fn,
        ...rest,
      );
    };
    return Object.assign(wrapped, original);
  };

  const wrapHook = (original: AnyFn): AnyFn =>
    function (this: unknown, fn?: AnyFn, ...rest: any[]) {
      return original.call(
        this,
        typeof fn === 'function' ? inProxyZone(fn) : fn,
        ...rest,
      );
    };

  // On Node, zone.js numbers fake timers 1, 2, 3... and real timers (e.g. Angular's change
  // detection scheduler timeout created in a hook, cancelled inside `fakeAsync`) are cancelled by
  // the same numeric id, so a real cancel could silently remove a fake RxJS timer. Start the
  // fake ids far away from the real ones.
  const fakeScheduler = new g.Zone['FakeAsyncTestZoneSpec']()._scheduler;
  fakeScheduler.constructor.nextNodeJSId = 1_000_000_000;
  fakeScheduler.constructor.nextId = fakeScheduler.constructor.getNextId();

  // A fresh ProxyZone for every test; registered first so it runs before the test's own hooks.
  g.beforeEach(() => {
    testProxyZone = ambientZone.fork(new ProxyZoneSpec());
  });

  const patch = (name: string, wrap: (original: AnyFn) => AnyFn) => {
    if (typeof g[name] === 'function') {
      g[name] = wrap(g[name]);
    }
  };

  // `.only` / `.skip` / `.each` ... are copied over by Object.assign, but they would bypass the
  // wrapper, so patch the variants used for registering tests explicitly.
  for (const key of ['it', 'test']) {
    const original = g[key];
    if (typeof original !== 'function') continue;
    const wrapped = wrapTestFn(original);
    for (const variant of ['only', 'skip', 'todo', 'concurrent', 'fails']) {
      if (
        typeof original[variant] === 'function' &&
        variant !== 'skip' &&
        variant !== 'todo'
      ) {
        wrapped[variant] = wrapTestFn(original[variant].bind(original));
      }
    }
    g[key] = wrapped;
  }
  patch('beforeEach', wrapHook);
  patch('afterEach', wrapHook);
  patch('beforeAll', wrapHook);
  patch('afterAll', wrapHook);
}
