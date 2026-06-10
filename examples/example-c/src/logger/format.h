#pragma once

#include "logger.h"

typedef union LogMessage {
  const char *text;
  int code;
} LogMessage;

typedef struct LogRecord {
  LogLevel level;
  LogMessage message;
  int sequence;
} LogRecord;

const char *logger_level_name(LogLevel level);
void logger_format_line(const LogRecord *record, char *buffer, int buffer_size);
