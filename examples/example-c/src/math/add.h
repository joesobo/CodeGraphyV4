#pragma once

typedef struct AddInput {
  int left;
  int right;
} AddInput;

int add(int left, int right);
int add_input(AddInput input);
