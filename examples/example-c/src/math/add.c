#include "add.h"

int add(int left, int right) {
  return left + right;
}

int add_input(AddInput input) {
  return add(input.left, input.right);
}
