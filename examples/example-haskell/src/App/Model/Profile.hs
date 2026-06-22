module App.Model.Profile where

data Profile = Profile
  { profileName :: String
  } deriving Show

describeProfile :: Profile -> String
describeProfile profile = profileName profile
