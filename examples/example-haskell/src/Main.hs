module Main where

import App.Feature.Runner (boot, renderGreeting)
import App.Model.Profile (Profile(..))
import App.Model.User (makeUser)

main :: IO ()
main = putStrLn (renderGreeting (boot (makeUser "Ada") (Profile "graph explorer")))
