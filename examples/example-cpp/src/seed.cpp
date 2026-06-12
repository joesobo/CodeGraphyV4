#include "seed.hpp"

namespace taskrunner {

TaskId next_task_id = 1000;
constexpr Priority kDefaultPriority = Priority::normal;

Task make_task(const std::string& name, Priority priority) {
  const TaskId id = next_task_id++;
  Task task(id, name, priority);
  return task;
}

TaskList seed_tasks() {
  TaskList tasks;
  tasks.push_back(make_task("import backlog", Priority::high));
  tasks.push_back(make_task("refresh cache", kDefaultPriority));
  tasks.push_back(make_task("write summary", Priority::low));
  return tasks;
}

} // namespace taskrunner
