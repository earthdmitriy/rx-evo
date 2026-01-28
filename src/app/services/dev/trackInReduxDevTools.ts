// redux-dev-tools.operator.ts
import { MonoTypeOperatorFunction, Observable } from 'rxjs';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: {
      connect: (config?: DevToolsConfig) => DevToolsConnection;
    };
  }
}

interface DevToolsConfig {
  name: string;
  features?: {
    pause?: boolean;
    lock?: boolean;
    persist?: boolean;
    export?: boolean;
    import?: string | boolean;
    jump?: boolean;
    skip?: boolean;
    reorder?: boolean;
    dispatch?: boolean;
    test?: boolean;
  };
  trace?: boolean;
  traceLimit?: number;
  maxAge?: number;
}

interface DevToolsConnection {
  send: (action: any, state: any, options?: any, instanceId?: string) => void;
  init: (initialState?: any) => void;
  subscribe: (listener: (message: any) => void) => () => void;
  unsubscribe: () => void;
  error: (payload: any) => void;
}

interface TrackInReduxDevToolsOptions<T = any> {
  /** Display name shown in Redux DevTools */
  name: string;

  /**
   * Function to generate the action name from the emitted value.
   * You can also pass a static string for a constant action name.
   */
  actionName?: string | ((value: T, index: number) => string);

  /**
   * Function to produce additional metadata for the action
   */
  actionMeta?: (value: T, index: number) => Record<string, any>;

  /**
   * Function to produce the action payload. By default the full value is used.
   */
  actionPayload?: (value: T, index: number) => any;

  /** Maximum number of entries to keep in history (default: 50) */
  maxAge?: number;

  /** Serialize the value before sending to DevTools */
  serialize?: (value: T) => any;

  /** Enable console logging for debugging */
  debug?: boolean;
}

/**
 * RxJS operator to track emitted values in Redux DevTools.
 *
 * @example
 * // Static action name
 * const observable$ = source$.pipe(
 *   trackInReduxDevTools({
 *     name: 'My stream',
 *     actionName: 'VALUE_CHANGED'
 *   })
 * );
 *
 * // Dynamic action name
 * const observable$ = source$.pipe(
 *   trackInReduxDevTools({
 *     name: 'User stream',
 *     actionName: (user, index) => user.isActive ? 'USER_ACTIVATED' : 'USER_INACTIVE'
 *   })
 * );
 */
export function trackInReduxDevTools<T>(
  options: TrackInReduxDevToolsOptions<T>,
): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>): Observable<T> => {
    return new Observable<T>((subscriber) => {
      let devToolsConnection: DevToolsConnection | null = null;
      let valueCount = 0;
      const instanceName = options.name || 'RxJS Stream';

      // Create a unique ID for this instance
      const instanceId = `rxjs_${instanceName.replace(/\s+/g, '_')}_${Date.now()}`;

      // Function to initialize DevTools
      const initDevTools = () => {
        if (
          typeof window === 'undefined' ||
          !window.__REDUX_DEVTOOLS_EXTENSION__
        ) {
          if (options.debug) {
            console.warn('Redux DevTools extension not found');
          }
          return null;
        }

        try {
          const connection = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
            name: instanceName,
            features: {
              pause: true,
              lock: true,
              persist: false,
              export: true,
              import: false,
              jump: true,
              skip: true,
              reorder: false,
              dispatch: false,
              test: false,
            },
            trace: false,
            traceLimit: 25,
            maxAge: options.maxAge || 50,
          });

          // Initialize the initial state
          connection.init(undefined);

          if (options.debug) {
            console.log(`Redux DevTools connected for: ${instanceName}`);
          }

          return connection;
        } catch (error) {
          if (options.debug) {
            console.error('Failed to connect to Redux DevTools:', error);
          }
          return null;
        }
      };

      // Function to derive an action name
      const getActionName = (value: T): string => {
        if (typeof options.actionName === 'function') {
          return options.actionName(value, valueCount);
        }

        if (options.actionName) {
          return options.actionName;
        }

        // Generate a default name based on the value type
        const valueType = typeof value;
        if (valueType === 'string') {
          return `STRING_VALUE_${valueCount}`;
        } else if (valueType === 'number') {
          return `NUMBER_VALUE_${valueCount}`;
        } else if (valueType === 'boolean') {
          return `BOOLEAN_VALUE_${valueCount}`;
        } else if (value === null) {
          return `NULL_VALUE_${valueCount}`;
        } else if (value === undefined) {
          return `UNDEFINED_VALUE_${valueCount}`;
        } else if (Array.isArray(value)) {
          return `ARRAY_VALUE_${valueCount}`;
        } else if (valueType === 'object') {
          return `OBJECT_VALUE_${valueCount}`;
        }

        return `VALUE_${valueCount}`;
      };

      // Function to derive action metadata
      const getActionMeta = (value: T): Record<string, any> => {
        if (options.actionMeta) {
          return options.actionMeta(value, valueCount);
        }

        return {
          timestamp: new Date().toISOString(),
          valueType: typeof value,
          valueCount,
          instanceId,
          isArray: Array.isArray(value),
          isNull: value === null,
          isUndefined: value === undefined,
        };
      };

      // Function to derive the action payload
      const getActionPayload = (value: T): any => {
        if (options.actionPayload) {
          return options.actionPayload(value, valueCount);
        }

        // Serialize the value if a serializer is provided
        if (options.serialize) {
          return options.serialize(value);
        }

        return value;
      };

      // Function to send a value to DevTools
      const sendToDevTools = (value: T) => {
        if (!devToolsConnection) {
          devToolsConnection = initDevTools();
        }

        if (!devToolsConnection) {
          return;
        }

        try {
          const actionName = getActionName(value);
          const actionPayload = getActionPayload(value);
          const actionMeta = getActionMeta(value);

          // Create an action object for DevTools
          const action = {
            type: actionName,
            payload: actionPayload,
            ...actionMeta,
          };

          // State snapshot for DevTools
          const stateForDevTools = {
            value: actionPayload,
            count: valueCount,
            lastUpdated: new Date().toISOString(),
            history: valueCount > 0 ? 'available' : 'initial',
          };

          // Send to DevTools
          devToolsConnection.send(action, stateForDevTools, {}, instanceId);

          if (options.debug) {
            console.log(`[Redux DevTools] ${actionName}:`, value);
          }

          valueCount++;
        } catch (error) {
          if (options.debug) {
            console.warn('Failed to send value to Redux DevTools:', error);
          }
        }
      };

      // Subscribe to the source observable
      const subscription = source.subscribe({
        next: (value: T) => {
          // Send the value to DevTools
          sendToDevTools(value);
          // Forward the value downstream
          subscriber.next(value);
        },
        error: (err: any) => {
          // Send the error to DevTools
          if (devToolsConnection) {
            try {
              const errorAction = {
                type: 'ERROR',
                payload: {
                  message: err?.message || 'Unknown error',
                  stack: err?.stack,
                },
                timestamp: new Date().toISOString(),
                instanceId,
              };

              devToolsConnection.send(
                errorAction,
                { error: true, lastError: err?.message },
                {},
                instanceId,
              );
            } catch (devToolsError) {
              // Ignore DevTools errors
            }
          }

          if (options.debug) {
            console.error(`[Redux DevTools] Error in ${instanceName}:`, err);
          }

          subscriber.error(err);
        },
        complete: () => {
          // Send completion event to DevTools
          if (devToolsConnection) {
            try {
              const completeAction = {
                type: 'COMPLETE',
                payload: {
                  totalValues: valueCount,
                  completedAt: new Date().toISOString(),
                },
                timestamp: new Date().toISOString(),
                instanceId,
              };

              devToolsConnection.send(
                completeAction,
                { completed: true, totalValuesProcessed: valueCount },
                {},
                instanceId,
              );
            } catch (error) {
              // Ignore DevTools errors
            }
          }

          if (options.debug) {
            console.log(
              `[Redux DevTools] Stream ${instanceName} completed after ${valueCount} values`,
            );
          }

          subscriber.complete();
        },
      });

      // Cleanup on unsubscribe
      return () => {
        subscription.unsubscribe();

        // Close the DevTools connection
        if (devToolsConnection) {
          try {
            devToolsConnection.unsubscribe();

            if (options.debug) {
              console.log(`[Redux DevTools] Disconnected: ${instanceName}`);
            }
          } catch (error) {
            if (options.debug) {
              console.warn('Error unsubscribing from Redux DevTools:', error);
            }
          }
        }
      };
    });
  };
}

/**
 * Helper functions for generating actionName
 */
export const ActionNameGenerators = {
  /** Generates action name based on value type */
  byValueType: <T>(value: T, index: number): string => {
    const type = typeof value;
    if (value === null) return 'NULL_RECEIVED';
    if (value === undefined) return 'UNDEFINED_RECEIVED';
    if (Array.isArray(value)) return `ARRAY_RECEIVED_${value.length}_ITEMS`;
    if (type === 'object') return 'OBJECT_RECEIVED';
    return `${type.toUpperCase()}_RECEIVED`;
  },

  /** Generates action name based on value with prefix */
  withPrefix:
    (prefix: string) =>
    <T>(value: T, index: number): string => {
      return `${prefix}_${index}`;
    },

  /** Generates action name based on object property */
  byObjectProperty:
    <T extends Record<string, any>>(
      propertyName: keyof T,
      prefix: string = '',
    ) =>
    (value: T, index: number): string => {
      const propValue = value[propertyName];
      const propType = typeof propValue;

      if (prefix) {
        return `${prefix}_${String(propertyName).toUpperCase()}_${propType.toUpperCase()}`;
      }

      return `${String(propertyName).toUpperCase()}_${propType.toUpperCase()}`;
    },

  /** Generates action name based on condition */
  byCondition:
    <T>(
      condition: (value: T) => boolean,
      trueAction: string,
      falseAction: string,
    ) =>
    (value: T, index: number): string => {
      return condition(value) ? trueAction : falseAction;
    },

  /** Generates action name with event type */
  withEventType:
    <T extends { type?: string }>(defaultType: string = 'EVENT') =>
    (value: T, index: number): string => {
      return value.type || defaultType;
    },

  /** Groups values by ranges */
  byRange:
    <T extends number>(
      ranges: Array<{ min: number; max: number; name: string }>,
      defaultName: string = 'OUT_OF_RANGE',
    ) =>
    (value: T, index: number): string => {
      for (const range of ranges) {
        if (value >= range.min && value <= range.max) {
          return range.name;
        }
      }
      return defaultName;
    },
};

/**
 * Predefined configurations for quick start
 */
export const ReduxDevToolsPresets = {
  /** For tracking data loading */
  dataLoading: <T>(): TrackInReduxDevToolsOptions<T> => ({
    name: 'Data Loading Stream',
    actionName: (value, index) => {
      if (value === null) return 'DATA_LOADING_NULL';
      if (Array.isArray(value)) return `DATA_LOADED_ARRAY_${value.length}`;
      return `DATA_LOADED_${typeof value}`;
    },
    debug: false,
  }),

  /** For tracking UI state */
  uiState: <T>(): TrackInReduxDevToolsOptions<T> => ({
    name: 'UI State Stream',
    actionName: (value, index) => {
      if (typeof value === 'boolean') {
        return value ? 'UI_STATE_ENABLED' : 'UI_STATE_DISABLED';
      }
      return `UI_STATE_${String(value).toUpperCase()}`;
    },
    debug: false,
  }),

  /** For tracking errors */
  errorTracking: <T>(): TrackInReduxDevToolsOptions<T> => ({
    name: 'Error Tracking Stream',
    actionName: (value, index) => {
      if (value instanceof Error) {
        return `ERROR_${value.name.toUpperCase()}`;
      }
      return 'ERROR_UNKNOWN';
    },
    serialize: (value) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }
      return value;
    },
    debug: true,
  }),

  /** For tracking user events */
  userEvents: <
    T extends { type: string; userId?: string },
  >(): TrackInReduxDevToolsOptions<T> => ({
    name: 'User Events Stream',
    actionName: (value, index) => {
      return `USER_${value.type.toUpperCase()}`;
    },
    actionMeta: (value, index) => ({
      userId: value.userId || 'anonymous',
      eventIndex: index,
      timestamp: new Date().toISOString(),
    }),
    debug: false,
  }),
};
