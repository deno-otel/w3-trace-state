import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std@0.184.0/testing/asserts.ts";
import {
  addTraceStateValue,
  deleteTraceStateValue,
  getEmptyTraceState,
  getTraceStateFromHeader,
  getTraceStateValue,
  updateTraceStateValue,
} from "./trace_state.ts";

const getByKey = (
  arr: ReadonlyArray<{ key: string; value: string }>,
  key: string,
) => arr.find((kv) => kv.key === key)?.value;

Deno.test("getEmptyTraceState", () => {
  const traceState = getEmptyTraceState();
  assertExists(traceState);
});

Deno.test("addTraceStateValue", async (test) => {
  await test.step("generates a new state object", () => {
    const traceState = getEmptyTraceState();
    const updated = addTraceStateValue(traceState, "key", "value");
    assertNotEquals(traceState, updated);
  });

  await test.step("adds a value", () => {
    const traceState = getEmptyTraceState();
    const updated = addTraceStateValue(traceState, "key", "value");
    assertEquals("value", getByKey(updated, "key"));
  });

  await test.step("throws on an invalid key", () => {
    const traceState = getEmptyTraceState();
    assertThrows(() => addTraceStateValue(traceState, "key$", "value"));
  });

  await test.step("throws on invalid values", () => {
    const traceState = getEmptyTraceState();
    assertThrows(() => addTraceStateValue(traceState, "key", "bad,value"));
  });

  await test.step("new values are added to the beginning of the list", () => {
    const traceState = getEmptyTraceState();
    const updated = addTraceStateValue(traceState, "key", "value");
    assertEquals("value", getByKey(updated, "key"));

    const secondUpdate = addTraceStateValue(updated, "key2", "value2");
    assertEquals(getByKey(secondUpdate, "key"), "value");

    assertNotEquals(getByKey(updated, "key2"), "value2");
    assertEquals(getByKey(secondUpdate, "key2"), "value2");

    assertEquals(
      0,
      secondUpdate.findIndex((kv) => kv.key === "key2"),
    );
    assertEquals(
      1,
      secondUpdate.findIndex((kv) => kv.key === "key"),
    );
  });

  await test.step("does update for pre-existing keys", () => {
    const traceState = getEmptyTraceState();
    const added = addTraceStateValue(traceState, "key", "value");
    const updated = addTraceStateValue(added, "key", "value2");
    assertEquals(getTraceStateValue(updated, "key"), "value2");
    assertEquals(1, updated.length);
  });
});

Deno.test("updateTraceStateValue", async (test) => {
  await test.step("generates a new state object", () => {
    const traceState = getEmptyTraceState();
    addTraceStateValue(traceState, "key", "value");
    const updated = updateTraceStateValue(traceState, "key", "value2");
    assertNotEquals(traceState, updated);
  });

  await test.step("adds a value", () => {
    const traceState = getEmptyTraceState();
    addTraceStateValue(traceState, "key", "value");
    const updated = updateTraceStateValue(traceState, "key", "value2");
    assertEquals("value2", getByKey(updated, "key"));
  });

  await test.step("throws on invalid key", () => {
    const traceState = getEmptyTraceState();
    assertThrows(() => updateTraceStateValue(traceState, "key,$", "value"));
  });

  await test.step("throws on invalid values", () => {
    const traceState = getEmptyTraceState();
    const updated = addTraceStateValue(traceState, "key", "goodvalue");
    assertThrows(() => updateTraceStateValue(updated, "key", "bad,value"));
  });

  await test.step("updated values are moved to the beginning of the list", () => {
    const traceState = getEmptyTraceState();
    const updated = addTraceStateValue(traceState, "key", "value");
    assertEquals("value", getByKey(updated, "key"));

    const secondUpdate = addTraceStateValue(updated, "key2", "value2");
    assertEquals("value", getByKey(secondUpdate, "key"));

    assertNotEquals("value2", getByKey(updated, "key2"));
    assertEquals("value2", getByKey(secondUpdate, "key2"));

    assertEquals(
      0,
      secondUpdate.findIndex((kv) => kv.key === "key2"),
    );
    assertEquals(
      1,
      secondUpdate.findIndex((kv) => kv.key === "key"),
    );

    const thirdUpdate = updateTraceStateValue(secondUpdate, "key", "value3");
    assertEquals(
      0,
      thirdUpdate.findIndex((kv) => kv.key === "key"),
    );
    assertEquals(
      1,
      thirdUpdate.findIndex((kv) => kv.key === "key2"),
    );
  });
});

Deno.test("getTraceStateValue", async (test) => {
  await test.step("returns undefined if there is no key match", () => {
    const traceState = getEmptyTraceState();
    const value = getTraceStateValue(traceState, "key");
    assertEquals(undefined, value);
  });

  await test.step("returns added value", () => {
    const traceState = getEmptyTraceState();
    const updated = addTraceStateValue(traceState, "key", "value");
    assertEquals("value", getTraceStateValue(updated, "key"));
  });

  await test.step("throws on invalid value", () => {
    const traceState = getEmptyTraceState();
    assertThrows(() => getTraceStateValue(traceState, "key,"));
  });
});

Deno.test("deleteTraceStateValue", async (test) => {
  await test.step("is a no-op on an empty trace", () => {
    const traceState = getEmptyTraceState();
    const newState = deleteTraceStateValue(traceState, "key");
    assertEquals(0, newState.length);
  });

  await test.step("deletes value by key", () => {
    const traceState = getEmptyTraceState();
    const updated = addTraceStateValue(traceState, "key", "value");
    const newState = deleteTraceStateValue(updated, "key");
    assertEquals(undefined, getTraceStateValue(newState, "key"));
  });

  await test.step("throws on invalid value", () => {
    const traceState = getEmptyTraceState();
    assertThrows(() => deleteTraceStateValue(traceState, "key,d"));
  });
});

Deno.test("getTraceStateFromHeader", async (test) => {
  await test.step("returns empty trace state on empty header", () => {
    const traceState = getTraceStateFromHeader("");
    assertEquals(0, traceState.length);
  });
  await test.step("returns empty trace state on whitespace-only header", () => {
    const traceState = getTraceStateFromHeader("    ");
    assertEquals(0, traceState.length);
  });
  await test.step("handles single entry", () => {
    const traceState = getTraceStateFromHeader("key1=val1");
    assertEquals(1, traceState.length);
    assertEquals("key1", traceState[0].key);
    assertEquals("val1", traceState[0].value);
  });
  await test.step("handles multiple entries", () => {
    const traceState = getTraceStateFromHeader("key1=val1,key2=val2");
    assertEquals(2, traceState.length);
    assertEquals("key1", traceState[0].key);
    assertEquals("val1", traceState[0].value);
    assertEquals("key2", traceState[1].key);
    assertEquals("val2", traceState[1].value);
  });

  await test.step("handles OWS characters ", () => {
    const traceState = getTraceStateFromHeader("key1 = val1 ,  key2= val2");
    assertEquals(2, traceState.length);
    assertEquals("key1", traceState[0].key);
    assertEquals("val1", traceState[0].value);
    assertEquals("key2", traceState[1].key);
    assertEquals("val2", traceState[1].value);
  });
});
