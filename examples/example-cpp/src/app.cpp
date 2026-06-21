#include "runner.hpp"
#include "seed.hpp"
#include "worker.hpp"

#include <cstddef>
#include <iostream>
#include <utility>

int main() {
  taskrunner::ConsoleWorker worker;
  taskrunner::TaskRunner runner(worker);
  taskrunner::TaskList tasks = taskrunner::seed_tasks();

  for (taskrunner::Task& task : tasks) {
    runner.enqueue(std::move(task));
  }

  const std::size_t completed = runner.run();
  std::cout << "completed " << completed << " task(s)\n";

  return runner.idle() ? 0 : 1;
}
