#include "math/add.h"
#include <stdio.h>

typedef struct Counter {
  int value;
} Counter;

static int next_count(Counter counter) {
  AddInput input = { counter.value, 1 };
  return add_input(input);
}

int main(void) {
  Counter counter = { 1 };
  printf("%d\n", next_count(counter));
  return 0;
}
