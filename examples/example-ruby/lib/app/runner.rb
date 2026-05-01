require_relative '../base/base_runner'
require_relative '../model/user'

module App
  class Runner < BaseRunner
    def run(user)
      user.name
    end
  end
end

def boot
  App::Runner.new
end
