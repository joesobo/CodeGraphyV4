#pragma once

#include "task.hpp"

namespace taskrunner {

class Worker {
public:
  virtual ~Worker() = default;

  virtual void execute(Task& task) = 0;
};

class ConsoleWorker final : public Worker {
public:
  void execute(Task& task) override;
};

} // namespace taskrunner
