package service

import (
	"strings"

	"example-go/internal/model"
)

const DefaultStatus, RetryStatus Status = "queued", "retry"

type Runner interface {
	Run(task model.Task) model.Result
}

type AuditingNotifier interface {
	model.Notifier
}

type TaskRunner struct {
	*model.Audited
	name     string
	notifier model.Notifier
}

type Status string

func NewTaskRunner(name string, notifier model.Notifier) TaskRunner {
	return TaskRunner{name: name, notifier: notifier}
}

func (runner TaskRunner) Run(task model.Task) model.Result {
	normalized := strings.ToUpper(task.Title)
	return model.Result{Summary: normalized, Status: string(DefaultStatus)}
}
