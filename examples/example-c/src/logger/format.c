#include "format.h"

#include <stdio.h>

void logger_format_line(const LogRecord *record, char *buffer, int buffer_size) {
  snprintf(
    buffer,
    (size_t)buffer_size,
    "[%s] #%d %s",
    logger_level_name(record->level),
    record->sequence,
    record->message.text
  );
}
