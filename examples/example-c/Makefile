CC ?= cc
CFLAGS ?= -Wall -Wextra -std=c11

example-c: src/main.c src/math/add.c src/math/add.h
	$(CC) $(CFLAGS) src/main.c src/math/add.c -o example-c

clean:
	$(RM) example-c
