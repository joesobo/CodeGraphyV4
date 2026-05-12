module App.Feature.Runner (Greeting(..), Runner(..), boot) where

import App.Model.User

data Greeting = Greeting String deriving Show

data Runner = Runner User deriving Show

boot :: User -> Runner
boot user = Runner user
