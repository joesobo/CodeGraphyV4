# Graph feel scenarios

These versioned scenarios are shared by the headless physics runner and visual webview replay harness. `atTick` uses a fixed physics tick, and pointer coordinates are graph-world coordinates. Actions must be ordered and must not depend on wall-clock timing.

The standard set covers cold settle at 1k and 10k, leaf and hub drag release, rapid drag shake, live force changes, a half-graph filter swap, and dragging while two nodes are pinned.
