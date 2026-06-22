module App.Model.User where

data User = User
  { userName :: String
  } deriving Show

makeUser :: String -> User
makeUser name = User name

describeUser :: User -> String
describeUser user = userName user
