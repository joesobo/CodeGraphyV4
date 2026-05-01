// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "SwiftExample",
  targets: [
    .executableTarget(
      name: "SwiftExample",
      dependencies: ["RunnerSupport"]
    ),
    .target(name: "RunnerSupport")
  ]
)
