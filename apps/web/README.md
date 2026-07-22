# @codegraphy/web

Public CodeGraphy web app target for account, subscription, billing, and Access flows.

The app currently reserves these routes:

- `/register`
- `/login`
- `/subscription`
- `/account`
- `/billing`
- `/access/:accessKey`

The access route is the host callback surface for returning paid capability state to CodeGraphy hosts and paid plugins. Account, authentication, subscription, and billing code belongs in this app rather than the VS Code extension.
