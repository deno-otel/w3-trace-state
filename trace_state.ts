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
 * Generates an empty trace state object.
 *
 * Mostly this can be used if your code is the originating source of a trace state header. Otherwise, @link{getTraceStateFromHeader} is probably what you want.
 */
export const getEmptyTraceState = (): TraceState => [];

const stateHasKey = (traceState: TraceState, key: string) =>
  traceState.some((kv) => kv.key === key);

/**
 * Extract a value from the trace state. The key must be a valid trace key and an error will be thrown if it is not
 */
export const getTraceStateValue = (
  state: TraceState,
  key: string,
): string | undefined => {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : null;
  if (validKey === null) {
    throw new Error(`Invalid key: ${key}`);
  }
  const kv = state.find((k) => k.key === validKey);
  return kv?.value;
};

/**
 * Adds a value to the trace state. The key and value must be valid trace key/value pairs and an error will be thrown if they are not.
 *
 * This will fallback to @link{updateTraceStateValue} if the key already exists in the trace state.
 */
export const addTraceStateValue = (
  state: TraceState,
  key: string,
  value: string,
): TraceState => {
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
};

/**
 * Updates a value in the trace state. The key and value must be valid trace key/value pairs and an error will be thrown if they are not.
 *
 * This will fallback to @link{addTraceStateValue} if the key does not exist in the trace state.
 */
export const updateTraceStateValue = (
  state: TraceState,
  key: string,
  value: string,
): TraceState => {
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
};

/**
 * Removes a key from the trace state. The key must be a valid trace key and an error will be thrown if it is not
 */
export const deleteTraceStateValue = (
  state: TraceState,
  key: string,
): TraceState => {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : null;
  if (validKey === null) {
    throw new Error(`Invalid key: ${key}`);
  }

  return state.filter((kv) => kv.key !== validKey);
};

/**
 * Converts an appropriately formatted trace state header into a trace state object.
 */
export const getTraceStateFromHeader = (header: string): TraceState => {
  const state = header
    .split(",")
    .filter((kv) => /=/.test(kv))
    .map((kv) => {
      const [key, value] = kv.split("=");
      return { key: key.trim(), value: value.trim() };
    });
  return state;
};

/**
 * Generates an appropriately formatted trace state header from a trace state object.
 */
export const getHeaderFromTraceState: (state: TraceState) => string = (state) =>
  state.map((kv) => `${kv.key}=${kv.value}`).join(",");
