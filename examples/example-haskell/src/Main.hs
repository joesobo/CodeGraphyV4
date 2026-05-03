module Main where

import App.Feature.Runner
import App.Model.User

main :: IO ()
main = print (boot (User "Ada"))
