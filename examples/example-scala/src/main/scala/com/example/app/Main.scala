package com.example.app

import com.example.model.User
import com.example.service.UserService
import com.example.view.DashboardView

object Main {
  def main(args: Array[String]): Unit = {
    val service = UserService.demo()
    val view = DashboardView()
    println(AppRunner(service, view).run(User("ada", "Ada Lovelace")))
  }
}
