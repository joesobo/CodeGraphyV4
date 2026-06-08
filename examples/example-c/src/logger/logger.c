#include "logger.h"
#include "format.h"

#include <stdio.h>

static int logger_output_enabled = 1;

static int logger_accepts(const Logger *logger, LogLevel level) {
  return logger_output_enabled && level >= logger->minimum_level;
}

const char *logger_level_name(LogLevel level) {
  switch (level) {
    case LOG_LEVEL_INFO:
      return "info";
    case LOG_LEVEL_WARN:
      return "warn";
    case LOG_LEVEL_ERROR:
      return "error";
    default:
      return "unknown";
  }
}

void logger_init(Logger *logger, LogLevel minimum_level) {
  logger->minimum_level = minimum_level;
  logger->message_count = 0;
  logger->dropped_count = 0;
}

void logger_write(Logger *logger, LogLevel level, const char *message) {
  if (!logger_accepts(logger, level)) {
    logger->dropped_count += 1;
    return;
  }

  char line[128];
  LogRecord record = { level, { .text = message }, logger->message_count + 1 };
  logger_format_line(&record, line, sizeof line);
  printf("%s\n", line);
  logger->message_count += 1;
}

void logger_flush(Logger *logger) {
  printf("flushed %d messages, dropped %d\n", logger->message_count, logger->dropped_count);
  logger->message_count = 0;
  logger->dropped_count = 0;
}
