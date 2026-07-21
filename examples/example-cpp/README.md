# C++ Example

Small C++ task queue runner for checking that CodeGraphy can show a real project shape instead of a one-file syntax sample.

Build and run it with CMake:

```bash
mkdir -p build
cd build
cmake ..
cmake --build .
./example-cpp
```

The example contains these C++ graph targets for the C++ upgrade work:

- Namespace: `taskrunner`.
- Classes: `Task`, `TaskQueue`, `Worker`, `ConsoleWorker`, and `TaskRunner`.
- Enums: `Priority` and `TaskStatus`.
- Callables: `main`, `make_task`, `seed_tasks`, and `priority_name`.
- Methods: `TaskRunner::run`, `TaskQueue::pop`, `ConsoleWorker::execute`, and the `Task` accessors.
- Aliases: `TaskId`, `TaskList`, and `PendingTaskQueue`.
- Template: `TaskQueue<Item>`.
- Variables: namespace-scope `next_task_id`, constants such as `kDefaultPriority`, class fields such as `queue_`, parameters such as `task`, and locals such as `completed`.

Local includes connect the project across headers and source files. The worker hierarchy gives inheritance and override edges, while the runner, worker, and seed functions give obvious calls and type references for later Graph Scope acceptance coverage.
