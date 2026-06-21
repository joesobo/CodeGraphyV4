#pragma once

#include "task.hpp"

#include <cstddef>
#include <deque>
#include <optional>
#include <utility>

namespace taskrunner {

template <typename Item>
class TaskQueue {
public:
  void push(Item item) {
    items_.push_back(std::move(item));
  }

  bool empty() const {
    return items_.empty();
  }

  std::optional<Item> pop() {
    if (items_.empty()) {
      return std::nullopt;
    }

    Item next = std::move(items_.front());
    items_.pop_front();
    return next;
  }

  std::size_t size() const {
    return items_.size();
  }

private:
  std::deque<Item> items_;
};

using PendingTaskQueue = TaskQueue<Task>;

} // namespace taskrunner
