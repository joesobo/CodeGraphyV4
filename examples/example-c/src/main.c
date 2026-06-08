#include "logger/logger.h"

int main(void) {
  Logger logger;

  logger_init(&logger, LOG_LEVEL_INFO);
  logger_write(&logger, LOG_LEVEL_INFO, "logger started");
  logger_write(&logger, LOG_LEVEL_WARN, "disk space is getting low");
  logger_write(&logger, LOG_LEVEL_ERROR, "failed to rotate log file");
  logger_flush(&logger);

  return 0;
}
