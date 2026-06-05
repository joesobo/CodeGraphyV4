package com.example.service

import com.example.model.User
import com.example.model.UserSummary
import com.example.repository.InMemoryUserRepository
import com.example.repository.UserRepository

final case class UserService(repository: UserRepository) {
  def enrich(user: User): UserSummary =
    repository.findSummary(user)
}

object UserService {
  def demo(): UserService =
    UserService(InMemoryUserRepository())
}
