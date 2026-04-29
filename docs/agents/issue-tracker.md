# Issue Tracker: Trello

Issues and PRDs for this repo live on the CodeGraphy Trello board:

https://trello.com/b/wG65Lfrb/codegraphy

Use the Trello REST API through `curl` and `jq`. The shell must have `TRELLO_API_KEY` and `TRELLO_TOKEN` configured.

## Board

- Board ID: `69af002961713864de1a93ff`
- Short link: `wG65Lfrb`

## Lists

| List | ID | Meaning |
| --- | --- | --- |
| `Ideas` | `69af0031d0d5f4ed5e4a764c` | Rough ideas, needs triage, needs info |
| `Bug` | `69af0040dcc683bf250fe811` | Confirmed bugs |
| `Todo` | `69af003fdf209bec5ae3ab09` | Ready implementation work |
| `In Progress` | `69af003346ade5ee06fa328c` | Active work |
| `Done` | `69af004f15293b54977fbdd5` | Completed work |

## Labels

Use Trello labels for package or area ownership:

- `Core`
- `API`
- `Python Plugin`
- `Godot Plugin`
- `TypeScript Plugin`
- `Markdown Plugin`
- `C# Plugin`
- `Docs`

## Conventions

- Create a card:
  `curl -s -X POST "https://api.trello.com/1/cards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" -d "idList={listId}" --data-urlencode "name={title}" --data-urlencode "desc={body}"`
- Read a card:
  `curl -s "https://api.trello.com/1/cards/{cardId}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" | jq`
- List cards on a list:
  `curl -s "https://api.trello.com/1/lists/{listId}/cards?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" | jq`
- Comment on a card:
  `curl -s -X POST "https://api.trello.com/1/cards/{cardId}/actions/comments?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" --data-urlencode "text={comment}"`
- Move a card:
  `curl -s -X PUT "https://api.trello.com/1/cards/{cardId}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" -d "idList={listId}"`
- Archive a card:
  `curl -s -X PUT "https://api.trello.com/1/cards/{cardId}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN" -d "closed=true"`

GitHub Issues are not the active tracker. If a GitHub issue is created by mistake, mirror it to Trello, comment with the Trello card URL, and close the GitHub issue.

## Skill phrases

- "publish to the issue tracker" means create a Trello card on the CodeGraphy board.
- "fetch the relevant ticket" means read the Trello card and its comments.
- "move to ready" means move the card to `Todo`.
- "start work" means move the card to `In Progress`.
- "mark done" means move the card to `Done`.
