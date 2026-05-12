package service

import "fmt"

type Runner struct {
	name string
}

func NewRunner(name string) Runner {
	return Runner{name: name}
}

func (runner Runner) Run() {
	fmt.Println(runner.name + " running")
}

func Run() {
	NewRunner("service").Run()
}
