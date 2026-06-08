#pragma once

#include "logger.h"

typedef struct LogRecord {
  LogLevel level;
  const char *message;
  int sequence;
} LogRecord;

const char *logger_level_name(LogLevel level);
void logger_format_line(const LogRecord *record, char *buffer, int buffer_size);

