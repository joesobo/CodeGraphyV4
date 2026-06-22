package notify

import "fmt"

type ConsoleNotifier struct{}

func NewConsoleNotifier() ConsoleNotifier {
	return ConsoleNotifier{}
}

func (notifier ConsoleNotifier) Send(message string) {
	fmt.Println(message)
}
