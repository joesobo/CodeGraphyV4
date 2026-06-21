#pragma once

typedef enum LogLevel {
  LOG_LEVEL_INFO,
  LOG_LEVEL_WARN,
  LOG_LEVEL_ERROR
} LogLevel;

typedef struct Logger {
  LogLevel minimum_level;
  int message_count;
  int dropped_count;
} Logger;

void logger_init(Logger *logger, LogLevel minimum_level);
void logger_write(Logger *logger, LogLevel level, const char *message);
void logger_flush(Logger *logger);

