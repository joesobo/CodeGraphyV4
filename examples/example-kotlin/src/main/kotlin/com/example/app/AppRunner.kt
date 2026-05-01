package com.example.app

import com.example.base.BaseRunner
import com.example.base.RunnableThing
import com.example.model.User

class AppRunner : BaseRunner(), RunnableThing {
  fun run(users: List<User>): User = users.first()
}

fun boot(): AppRunner = AppRunner()
