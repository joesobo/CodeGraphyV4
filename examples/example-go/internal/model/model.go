package model

type Audited struct {
	CreatedBy string
}

type Task struct {
	Title string
}

type Result struct {
	Summary string
	Status  string
}

type Notifier interface {
	Send(message string)
}
