#pragma once

#include "task_queue.hpp"
#include "worker.hpp"

#include <cstddef>

namespace taskrunner {

class TaskRunner {
public:
  explicit TaskRunner(Worker& worker);

  void enqueue(Task task);
  std::size_t run();
  bool idle() const;

private:
  PendingTaskQueue queue_;
  Worker& worker_;
};

} // namespace taskrunner
