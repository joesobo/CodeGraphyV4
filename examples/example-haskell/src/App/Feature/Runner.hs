module App.Feature.Runner (Runner(..), boot) where

import App.Model.User

data Runner = Runner User deriving Show

boot :: User -> Runner
boot user = Runner user
