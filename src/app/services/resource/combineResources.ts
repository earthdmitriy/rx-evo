import { computed, Resource, ResourceStatus } from '@angular/core';

// magic
type UnwrapResource<T> = T extends Resource<infer U> ? U : T;
type UnwrapResources<T extends unknown[]> = T extends [
  infer Head,
  ...infer Tail,
]
  ? [UnwrapResource<Head>, ...UnwrapResources<Tail>]
  : [];

const resourceStatusPriorities: { [key in ResourceStatus]: number } = {
  [ResourceStatus.Idle]: 0,
  [ResourceStatus.Resolved]: 1,
  [ResourceStatus.Local]: 2,
  [ResourceStatus.Error]: 3,
  [ResourceStatus.Loading]: 4,
  [ResourceStatus.Reloading]: 5,
};

export const combineResources = <T extends [...Resource<unknown>[]], Result>(
  args: [...T],
  processResponse: (data: UnwrapResources<T>) => Result,
): Resource<Result> => {
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
        ResourceStatus.Idle,
      ),
  );

  const reload = () => args.reduce((acc, res) => acc && res.reload(), true);

  return {
    isLoading: computed(() => args.map((s) => s.isLoading()).some((r) => r)),
    error,
    value,
    hasValue,
    reload,
    status,
  } as unknown as Resource<Result>;
};
