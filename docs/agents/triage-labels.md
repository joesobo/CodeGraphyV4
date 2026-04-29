# Triage Workflow

Trello uses lists for workflow state and labels for package or area ownership.

| Skill term | Trello mapping | Meaning |
| --- | --- | --- |
| `needs-triage` | `Ideas` list | Maintainer needs to evaluate this card |
| `needs-info` | `Ideas` list with a top-level `Needs info` note in the description | Waiting on more information |
| `ready-for-agent` | `Todo` list | Fully specified, ready for an agent |
| `ready-for-human` | `Todo` list with a top-level `Human review needed` note in the description | Requires human implementation or judgment |
| `wontfix` | Comment with the reason, then archive the card | Will not be actioned |
| `in-progress` | `In Progress` list | Active work |
| `done` | `Done` list | Completed work |

Use Trello labels only for package or area ownership, such as `Core`, `API`, `Godot Plugin`, `Markdown Plugin`, or `Docs`.
