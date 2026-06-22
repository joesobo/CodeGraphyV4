package app

import (
	"fmt"

	"example-go/internal/model"
	"example-go/internal/notify"
	"example-go/internal/service"
)

const startupMessage = "ready"

type Config struct {
	Name string
}

func Start() {
	config := Config{Name: "task queue"}
	notifier := notify.NewConsoleNotifier()
	runner := service.NewTaskRunner(config.Name, notifier)
	task := model.Task{
		Title: config.Name,
	}
	result := runner.Run(task)
	notifier.Send(fmt.Sprintf("%s %s", result.Summary, startupMessage))
}
