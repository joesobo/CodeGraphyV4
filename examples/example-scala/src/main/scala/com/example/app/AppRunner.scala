package com.example.app

import com.example.base.BaseRunner
import com.example.model.User
import com.example.service.UserService
import com.example.view.DashboardView

final case class AppRunner(service: UserService, view: DashboardView) extends BaseRunner {
  def run(user: User): String = {
    val enriched = service.enrich(user)
    view.render(enriched)
  }
}

object AppConfig {
  val productName: String = "CodeGraphy Scala Demo"
}

enum Status { case Ready }

type UserName = String
