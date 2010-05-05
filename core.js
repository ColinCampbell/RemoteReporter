// ==========================================================================
// Project:   Unbugger
// Copyright: ©2010 My Company, Inc.
// ==========================================================================
/*jslint evil: true */
/*globals RemoteReporter */

/** @class

  Reports logs, etc to the SComet server.
  
  @extends SC.Object
*/
RemoteReporter = SC.Object.extend(
  /** @scope RemoteReporter.prototype */ {

    /**
      Create the reporter object. If runOnInit is false, you must call
      RemoteReporter.startCommandListening() in order to listen for
      commands.
      
      @param runOnInit start comet listening right away. Default true.
    */
    init: function(runOnInit) {
      sc_super();
      
      if (SC.none(runOnInit) || runOnInit) this.startCommandListening();
      
      // don't want to block
      SC.Event.add(window, 'unload', this, function() {
        this.killCommandListening();
      });
    },
    
    // ..........................................................
    // MESSAGE SUPPORT
    //
    
    /**
      The location of the messages relay.
      
      @property {String}
    */
    messagesUrl: '/messages',
    
    _send: function(type, s) {
      var data = {
        type: type,
        message: s,
        sessionStart: RemoteReporter.SESSION_START_TIME
      };
      
      // sc-server doesn't allow parallel requests to go through the proxy
      // so we need to temporarily kill the command listening
      this.killCommandListening();
      
      SC.Request
        .postUrl(this.get('messagesUrl'), data)
        .json()
        .notify(this, this._didSendMessage)
        .send();
    },
    
    _didSendMessage: function(response) {
      // don't really care if the message succeeded or errored
      this.startCommandListening();
    },
    
    log: function(s) {
      this._send("log", s);
    },
    
    error: function(s) {
      this._send("error", s);
    },
    
    info: function(s) {
      this._send("info", s);
    },
    
    warn: function(s) {
      this._send("warn", s);
    },
    
    // ..........................................................
    // COMMAND SUPPORT
    //
    
    /**
      The location of the commands relay.
      
      @property {String}
    */
    commandsUrl: '/commands',
    
    _lastTimeAsked: null,
    
    _response: null,
    
    startCommandListening: function() {
      this.killCommandListening(); // don't want multiple requests at once
      
      var url = this.get('commandsUrl');
      url += !SC.none(this._lastTimeAsked) ? "?since=" + this._lastTimeAsked : "";
      this._response = SC.Request
        .getUrl(url)
        .json()
        .notify(this, this._didReceiveCommand)
        .send();
    },
    
    killCommandListening: function() {
      if (this._response) SC.Request.manager.cancel(this._response); 
    },
    
    _didReceiveCommand: function(response) {
      var reporter = this, ok = SC.ok(response);
      
      if (ok) {
        var data = response.get('body');
        if (!data.isEnumerable) {
          data = [data];
        }
        data.forEach(function(command) {
          if (!SC.none(command.message)) {
            // send back results
            try {
              reporter.log(eval(command.message));
            } catch(e) {
              reporter.error(e);
            }
          }
        });
      }
      
      // should we continue polling? sc-server times out the request
      // after 60s, so just continue polling. If it's another error,
      // stop polling
      if (ok || response.get('timedOut')) {
        this._lastTimeAsked = Date.now();
        this.startCommandListening();
      } 
    }

}) ;

RemoteReporter.SESSION_START_TIME = Date.now();
