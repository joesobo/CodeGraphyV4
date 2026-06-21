package com.example.repository

import com.example.model.AccountTier
import com.example.model.User
import com.example.model.UserSummary

trait UserRepository {
  def findSummary(user: User): UserSummary
}

final class InMemoryUserRepository extends UserRepository {
  def findSummary(user: User): UserSummary =
    UserSummary(user.id, user.name, AccountTier.Pro)
}
