#include "runner.hpp"

#include <utility>

namespace taskrunner {

TaskRunner::TaskRunner(Worker& worker)
  : worker_(worker) {}

void TaskRunner::enqueue(Task task) {
  queue_.push(std::move(task));
}

std::size_t TaskRunner::run() {
  std::size_t completed = 0;

  while (auto task = queue_.pop()) {
    worker_.execute(*task);
    ++completed;
  }

  return completed;
}

bool TaskRunner::idle() const {
  return queue_.empty();
}

} // namespace taskrunner
