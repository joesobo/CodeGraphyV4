#include "lib/widget.hpp"
#include <vector>

namespace example {

class Runner : public Widget {
public:
  void run() {}
};

int boot() {
  Runner runner;
  Widget widget = make_widget();
  widget.render();
  runner.run();
  return 0;
}

}
