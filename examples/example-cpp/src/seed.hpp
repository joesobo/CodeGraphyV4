#pragma once

#include "task.hpp"

#include <string>
#include <vector>

namespace taskrunner {

using TaskList = std::vector<Task>;

Task make_task(const std::string& name, Priority priority);
TaskList seed_tasks();

} // namespace taskrunner
