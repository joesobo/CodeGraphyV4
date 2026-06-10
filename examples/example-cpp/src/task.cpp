#include "task.hpp"

#include <utility>

namespace taskrunner {

constexpr TaskStatus kInitialStatus = TaskStatus::queued;

Task::Task(TaskId id, std::string name, Priority priority)
  : id_(id),
    name_(std::move(name)),
    priority_(priority),
    status_(kInitialStatus) {}

TaskId Task::id() const {
  return id_;
}

const std::string& Task::name() const {
  return name_;
}

Priority Task::priority() const {
  return priority_;
}

TaskStatus Task::status() const {
  return status_;
}

void Task::mark_running() {
  status_ = TaskStatus::running;
}

void Task::mark_completed() {
  status_ = TaskStatus::completed;
}

const char* priority_name(Priority priority) {
  switch (priority) {
    case Priority::low:
      return "low";
    case Priority::normal:
      return "normal";
    case Priority::high:
      return "high";
  }

  return "unknown";
}

} // namespace taskrunner
