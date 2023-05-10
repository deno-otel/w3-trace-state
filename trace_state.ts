function createKey(_: string): string {
  return crypto.randomUUID();
}

export type TraceState = ReadonlyArray<{ key: string; value: string }>;

/*
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
  value    = 0*255(chr) nblk-chr
  nblk-chr = %x21-2B / %x2D-3C / %x3E-7E
  chr      = %x20 / nblk-chr
*/
const TRACE_VALUE_REGEX =
  /^[\x20\x21-\x2b\x2d-\x3c\x3e-\x7e]{0,255}[\x21-\x2b\x2d-\x3c\x3e-\x7e]$/;

export const getEmptyTraceState = (): TraceState => [];

const stateHasKey = (traceState: TraceState, key: string) =>
  traceState.some((kv) => kv.key === key);

export const getTraceStateValue = (
  state: TraceState,
  key: string
): string | undefined => {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : null;
  if (validKey === null) {
    throw new Error(`Invalid key: ${key}`);
  }
  const kv = state.find((k) => k.key === validKey);
  return kv?.value;
};

export const addTraceStateValue = (
  state: TraceState,
  key: string,
  value: string
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

export const updateTraceStateValue = (
  state: TraceState,
  key: string,
  value: string
): TraceState => {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : createKey(key);
  const validValue = TRACE_VALUE_REGEX.test(value) ? value : "";
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

export const deleteTraceStateValue = (
  state: TraceState,
  key: string
): TraceState => {
  const validKey = TRACE_KEY_REGEX.test(key) ? key : createKey(key);
  if (validKey === null) {
    throw new Error(`Invalid key: ${key}`);
  }

  return state.filter((kv) => kv.key !== validKey);
};
