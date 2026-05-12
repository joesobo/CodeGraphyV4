local user = require("app.model.user")

local Runner = {}

function Runner.run(name)
  return user.new(name)
end

function Runner.greet(name)
  return "Hello " .. Runner.run(name).name
end

local function boot()
  return Runner.run("Ada")
end

return Runner
