cmake_minimum_required(VERSION 3.20)
project(example_cpp LANGUAGES CXX)

add_executable(example-cpp
  src/app.cpp
  src/lib/widget.cpp
)

target_compile_features(example-cpp PRIVATE cxx_std_17)
