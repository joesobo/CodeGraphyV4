package com.example.model

case class User(id: String, name: String)

case class UserSummary(id: String, displayName: String, tier: AccountTier)

enum AccountTier {
  case Free, Pro, Team
}
