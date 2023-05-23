# W3 Trace State

This module implements the
[Trace State part](https://www.w3.org/TR/2021/REC-trace-context-1-20211123/#tracestate-header)
of the W3 Trace Context W3 Recommendation.

`TraceState` objects are immutable, so all mutating functions return a new
instance.

This module follows the recommendation that modified and newly created
key/values are put at the beginning of the string representation of the state.
As a result, the order in which you add new key/values pairs is relevant.
