package com.example.app

import com.example.base.BaseRunner
import com.example.model.User

class AppRunner extends BaseRunner {
  def run(user: User): String = user.name
}

object AppConfig

enum Status { case Ready }

type UserName = String
