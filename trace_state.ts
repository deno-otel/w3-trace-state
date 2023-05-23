/**
 * This type should be treated as if it is opaque and should only be interacted with via the functions in this module.
 */
export type TraceState = ReadonlyArray<{ key: string; value: string }>;

/*
  https://www.w3.org/TR/2021/REC-trace-context-1-20211123/#key

key = simple-key / multi-tenant-key
simple-key = lcalpha 0*255( lcalpha / DIGIT / "_" / "-"/ "*" / "/" )
multi-tenant-key = tenant-id "@" system-id
tenant-id = ( lcalpha / DIGIT ) 0*240( lcalpha / DIGIT / "_" / "-"/ "*" / "/" )
system-id = lcalpha 0*13( lcalpha / DIGIT / "_" / "-"/ "*" / "/" )
lcalpha    = %x61-7A ; a-z
*/
const TRACE_KEY_REGEX =
  /^(?:(?:[a-z][-a-z0-9_*/]{0,255})|(?:[a-z0-9][-a-z0-9_*/]{0,240}@[a-z][-a-z0-9_*/]{0,13}))$/;

/*
  https://www.w3.org/TR/2021/REC-trace-context-1-20211123/#key

  value    = 0*255(chr) nblk-chr
  nblk-chr = %x21-2B / %x2D-3C / %x3E-7E
  chr      = %x20 / nblk-chr
*/
const TRACE_VALUE_REGEX =
  /^[\x20\x21-\x2b\x2d-\x3c\x3e-\x7e]{0,255}[\x21-\x2b\x2d-\x3c\x3e-\x7e]$/;

/**
 * Generates an empty {@link TraceState} object.
 *
 * Mostly this can be used if your code is the originating source of a `tracestate` header. Otherwise, {@link getTraceStateFromHeader} is probably what you want.
 */
export function getEmptyTraceState(): TraceState {
  return [];
}

const stateHasKey = (traceState: TraceState, key: string) =>
  traceState.some((kv) => kv.key === key);

/**
 * Extract a value from the {@link TraceState}. The key must be a valid trace key and an error will be thrown if it is not
 * @param state a valid {@link TraceState}
 * @param key a valid trace key
 * @returns the value associated with the key, or undefined if the key does not exist in the {@link TraceState}
 */
export function getTraceStateValue(
  state: TraceState,
  key: string
): string | undefined {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : null;
  if (validKey === null) {
    throw new Error(`Invalid key: ${key}`);
  }
  const kv = state.find((k) => k.key === validKey);
  return kv?.value;
}

/**
 * Adds a value to the {@link TraceState}. The key and value must be valid trace key/value pairs and an error will be thrown if they are not.
 *
 * This will fallback to {@link updateTraceStateValue} if the key already exists in the {@link TraceState}.
 *
 * @param state a valid {@link TraceState}
 * @param key a valid trace key
 * @param value a valid trace value
 * @returns a new {@link TraceState} with the new key/value pair added
 */
export function addTraceStateValue(
  state: TraceState,
  key: string,
  value: string
): TraceState {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : null;
  const validValue = TRACE_VALUE_REGEX.test(value) ? value : null;

  if (validKey === null) {
    throw new Error(`Invalid key: ${key}`);
  }
  if (validValue === null) {
    throw new Error(`Invalid value: ${value}`);
  }

  if (stateHasKey(state, validKey)) {
    return updateTraceStateValue(state, validKey, validValue);
  }
  return [{ key: validKey, value: validValue }, ...state];
}

/**
 * Updates a value in the {@link TraceState}. The key and value must be valid trace key/value pairs and an error will be thrown if they are not.
 *
 * This will fallback to {@link addTraceStateValue} if the key does not exist in the {@link TraceState}.
 *
 * @param state a valid {@link TraceState}
 * @param key a valid trace key
 * @param value a valid trace value
 * @returns a new {@link TraceState} with the updated value
 */
export function updateTraceStateValue(
  state: TraceState,
  key: string,
  value: string
): TraceState {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : null;
  const validValue = TRACE_VALUE_REGEX.test(value) ? value : null;
  if (validKey === null) {
    throw new Error(`Invalid key: ${key}`);
  }
  if (validValue === null) {
    throw new Error(`Invalid value: ${value}`);
  }

  if (!stateHasKey(state, validKey)) {
    return addTraceStateValue(state, validKey, validValue);
  }

  return [
    { key: validKey, value: validValue },
    ...state.filter((kv) => kv.key !== validKey),
  ];
}

/**
 * Removes a key from the {@link TraceState}. The key must be a valid trace key and an error will be thrown if it is not
 *
 * @param state a valid {@link TraceState}
 * @param key a valid trace key
 * @returns a new {@link TraceState} with the key removed
 */
export function deleteTraceStateValue(
  state: TraceState,
  key: string
): TraceState {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : null;
  if (validKey === null) {
    throw new Error(`Invalid key: ${key}`);
  }

  return state.filter((kv) => kv.key !== validKey);
}

/**
 * Converts an appropriately formatted {@link TraceState} header into a {@link TraceState} object.
 *
 * @param header a string that conforms to the W3 specification of a `tracestate` header
 * @returns a valid {@link TraceState}
 *
 */
export function getTraceStateFromHeader(header: string): TraceState {
  const state = header
    .split(",")
    .filter((kv) => /=/.test(kv))
    .map((kv) => {
      const [key, value] = kv.split("=");
      return { key: key.trim(), value: value.trim() };
    });
  return state;
}

/**
 * Generates an appropriately formatted {@link TraceState} header from a {@link TraceState} object.
 *
 * @param state a valid {@link TraceState}
 * @returns a string that conforms to the W3 specification of a `tracestate` header
 */
export function getHeaderFromTraceState(state: TraceState) {
  return state.map((kv) => `${kv.key}=${kv.value}`).join(",");
}
