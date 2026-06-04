package com.example.view

import com.example.model.AccountTier
import com.example.model.UserSummary

final case class DashboardView() {
  def render(summary: UserSummary): String =
    s"${summary.displayName} (${label(summary.tier)})"

  private def label(tier: AccountTier): String =
    tier match {
      case AccountTier.Free => "free"
      case AccountTier.Pro => "pro"
      case AccountTier.Team => "team"
    }
}
