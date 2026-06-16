module App.Feature.Runner (Greeting, Runnable(..), Runner(..), RunnerId(..), boot, renderGreeting) where

import App.Model.Profile (Profile, describeProfile)
import App.Model.User (User, describeUser)

newtype RunnerId = RunnerId Int deriving Show

data Greeting = Greeting String deriving Show

data Runner = Runner
  { runnerId :: RunnerId
  , runnerUser :: User
  , runnerProfile :: Profile
  } deriving Show

class Runnable task where
  greet :: task -> Greeting

instance Runnable Runner where
  greet runner = Greeting ("Hello, " ++ describeUser (runnerUser runner) ++ " the " ++ describeProfile (runnerProfile runner))

boot :: User -> Profile -> Runner
boot user profile = Runner (RunnerId 1) user profile

renderGreeting :: Runnable task => task -> String
renderGreeting task =
  case greet task of
    Greeting message -> message
