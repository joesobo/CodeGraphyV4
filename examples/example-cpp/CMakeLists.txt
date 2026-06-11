cmake_minimum_required(VERSION 3.9)
project(example_cpp LANGUAGES CXX)

add_executable(example-cpp
  src/app.cpp
  src/runner.cpp
  src/seed.cpp
  src/task.cpp
  src/worker.cpp
)

target_compile_features(example-cpp PRIVATE cxx_std_17)
target_include_directories(example-cpp PRIVATE src)
