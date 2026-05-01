#include "lib/widget.hpp"
#include <vector>

namespace example {

class Runner : public Widget {
public:
  void run() {}
};

int boot() {
  Runner runner;
  runner.run();
  return 0;
}

}
