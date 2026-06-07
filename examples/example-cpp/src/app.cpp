#include "lib/widget.hpp"
#include <vector>

class Runner : public Widget {
public:
  void render() override {}
  void run() {}
};

int boot() {
  Runner runner;
  Widget widget = make_widget();
  widget.render();
  runner.run();
  return 0;
}
