# ===========================================================================
# Project:   Unbugger
# Copyright: ©2010 My Company, Inc.
# ===========================================================================

config :all,
  :required => [:sproutcore, :scomet]

proxy '/messages', :to => '127.0.0.1:3000'
proxy '/commands', :to => '127.0.0.1:3001'