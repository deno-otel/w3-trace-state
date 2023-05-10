import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertThrows,
} from "https://deno.land/std@0.184.0/testing/asserts.ts";
import {
  getEmptyTraceState,
  addTraceStateValue,
  updateTraceStateValue,
} from "./trace_state.ts";

const getByKey = (
  arr: ReadonlyArray<{ key: string; value: string }>,
  key: string
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
    assertEquals("value", getByKey(secondUpdate, "key"));

    assertNotEquals("value2", getByKey(updated, "key2"));
    assertEquals("value2", getByKey(secondUpdate, "key2"));

    assertEquals(
      0,
      secondUpdate.findIndex((kv) => kv.key === "key2")
    );
    assertEquals(
      1,
      secondUpdate.findIndex((kv) => kv.key === "key")
    );
  });
});

Deno.test("updateTraceStateValue", async (test) => {
  await test.step("generates a new state object", () => {
    const traceState = getEmptyTraceState();
    const added = addTraceStateValue(traceState, "key", "value");
    const updated = updateTraceStateValue(traceState, "key", "value2");
    assertNotEquals(traceState, updated);
  });

  await test.step("adds a value", () => {
    const traceState = getEmptyTraceState();
    const added = addTraceStateValue(traceState, "key", "value");
    const updated = updateTraceStateValue(traceState, "key", "value2");
    assertEquals("value2", getByKey(updated, "key"));
  });

  await test.step("throws on invalid key", () => {
    const traceState = getEmptyTraceState();
    assertThrows(() => addTraceStateValue(traceState, "key,$", "value"));
  });

  await test.step("throws on invalid values", () => {
    const traceState = getEmptyTraceState();
    assertThrows(() => updateTraceStateValue(traceState, "key", "bad,value"));
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
      secondUpdate.findIndex((kv) => kv.key === "key2")
    );
    assertEquals(
      1,
      secondUpdate.findIndex((kv) => kv.key === "key")
    );

    const thirdUpdate = updateTraceStateValue(secondUpdate, "key", "value3");
    assertEquals(
      0,
      thirdUpdate.findIndex((kv) => kv.key === "key")
    );
    assertEquals(
      1,
      thirdUpdate.findIndex((kv) => kv.key === "key2")
    );
  });
});
