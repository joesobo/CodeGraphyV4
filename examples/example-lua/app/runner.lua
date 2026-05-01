local user = require("example-lua.app.model.user")

local Runner = {}

function Runner.run(name)
  return user.new(name)
end

local function boot()
  return Runner.run("Ada")
end

return Runner
