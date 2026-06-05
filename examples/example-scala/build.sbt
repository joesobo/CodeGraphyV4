ThisBuild / scalaVersion := "3.5.2"

lazy val root = (project in file("."))
  .settings(
    name := "codegraphy-scala-example",
    libraryDependencies += "org.typelevel" %% "cats-core" % "2.12.0"
  )
