CC ?= cc
CFLAGS ?= -Wall -Wextra -std=c11
TARGET := tiny-logger
SOURCES := src/main.c src/logger/logger.c src/logger/format.c
HEADERS := src/logger/logger.h src/logger/format.h

$(TARGET): $(SOURCES) $(HEADERS)
	$(CC) $(CFLAGS) $(SOURCES) -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	$(RM) $(TARGET)
