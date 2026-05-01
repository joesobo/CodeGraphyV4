import Foundation
import RunnerSupport

class Runner: Worker, Runnable {
  func run() -> String {
    "ready"
  }
}

func boot() -> Runner {
  Runner()
}
