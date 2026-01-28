import { computed, Resource, ResourceRef, ResourceStatus } from '@angular/core';

// magic
type UnwrapResource<T> = T extends ResourceRef<infer U> ? U : T;
type UnwrapResources<T extends unknown[]> = T extends [
  infer Head,
  ...infer Tail,
]
  ? [UnwrapResource<Head>, ...UnwrapResources<Tail>]
  : [];

const resourceStatusPriorities: { [key in ResourceStatus]: number } = {
  idle: 0,
  resolved: 1,
  local: 2,
  error: 3,
  loading: 4,
  reloading: 5,
};

export const combineResources = <T extends [...ResourceRef<unknown>[]], Result>(
  args: [...T],
  processResponse: (data: UnwrapResources<T>) => Result,
): ResourceRef<Result> => {
  const error = computed(() => args.map((s) => s.error()).some((e) => e));
  const value = computed(() => {
    if (error()) return undefined;
    const res = args.map((s) => s.value());
    if (res.some((data) => data === undefined)) return undefined;
    return processResponse(res as UnwrapResources<T>);
  });

  const hasValue = computed(() => !!value());

  // TODO think how to combine statuses properly
  const status = computed(() =>
    args
      .map((s) => s.status())
      .reduce(
        (acc, curr) =>
          resourceStatusPriorities[acc] > resourceStatusPriorities[curr]
            ? acc
            : curr,
        'idle',
      ),
  );

  const reload = () =>
    args.forEach((res: ResourceRef<unknown>) => res.reload());

  // TODO get rid of unknown conversion
  return {
    isLoading: computed(() => args.map((s) => s.isLoading()).some((r) => r)),
    error,
    value,
    hasValue,
    reload,
    status,
  } as unknown as ResourceRef<Result>;
};
