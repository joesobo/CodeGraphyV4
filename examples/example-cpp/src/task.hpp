#pragma once

#include <cstdint>
#include <string>

namespace taskrunner {

using TaskId = std::uint64_t;

enum class Priority {
  low,
  normal,
  high,
};

enum class TaskStatus {
  queued,
  running,
  completed,
};

class Task {
public:
  Task(TaskId id, std::string name, Priority priority);

  TaskId id() const;
  const std::string& name() const;
  Priority priority() const;
  TaskStatus status() const;

  void mark_running();
  void mark_completed();

private:
  TaskId id_;
  std::string name_;
  Priority priority_;
  TaskStatus status_;
};

const char* priority_name(Priority priority);

} // namespace taskrunner
