#include "worker.hpp"

#include <iostream>

namespace taskrunner {

void ConsoleWorker::execute(Task& task) {
  task.mark_running();

  std::cout << "[" << priority_name(task.priority()) << "] "
            << "#" << task.id() << " "
            << task.name() << "\n";

  task.mark_completed();
}

} // namespace taskrunner
