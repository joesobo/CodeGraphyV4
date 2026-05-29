# @codegraphy/web

Public CodeGraphy web app target for account, subscription, billing, and Access flows.

This first Extract Pro slice establishes the workspace package and route contract:

- `/register`
- `/login`
- `/subscription`
- `/account`
- `/billing`
- `/access/:accessKey`

The access route is the host callback surface for returning paid capability state to CodeGraphy hosts and paid plugins. Full UI, auth, and billing implementation belongs directly in this web app.
