var express = require('express'),
  uuid = require('node-uuid');


// Class to handle user\token generation and authorization.
function AuthorizationHandler(storage) {
  this.storage = storage;
  this.tokenPrefix = 'announce:token:';
  this.groupPrefix = 'announce:group:';
}
AuthorizationHandler.prototype = {

  // set a UUID token and map it to a user ID.
  getToken: function(userId, next) {
    var storage = this.storage;
    var key = this.tokenPrefix + userId;
    var token = null;
    storage.get(key, function(err, reply){
      // no token found for the user
      if (!reply) {
        token = uuid.v4();
        token = token.replace(/-+/g, '');
        storage.set(key, token);
      } else {
        token = reply;
      }
      next(token);
    });
  },

  // register a user to a group
  registerToGroup: function(userId, groupName, next) {
    var groupKey = this.groupPrefix + groupName;
    storage = this.storage;
    storage.sadd(groupKey, userId, function(err, reply){
      if (!err) {
        next(true);
        return;
      }
      next(false);
    });
  },

  // unregister a user to a group
  unregisterFromGroup: function(userId, groupName, next) {
    var groupKey = this.groupPrefix + groupName;
    storage = this.storage;
    storage.srem(groupKey, userId, function(err, reply) {
      next();
    });
  },

  // get members of a group
  getGroup: function(groupName, next) {
    var groupKey = this.groupPrefix + groupName;
    storage = this.storage;
    storage.smembers(groupKey, function(err, reply) {
      next(reply);
    });
  },

  // given a token, return the user ID.
  // if no user is found for the token, return null.
  authenticateRequest: function(userId, token, next) {
    if (!token || !userId) {
      next(null);
      return;
    }
    var key = this.tokenPrefix + userId;
    this.storage.get(key, function(err, reply) {
      if (!reply) {
        next(null);
        return;
      } 
      if (reply == token) {
        next(userId);
        return;
      }
      next(null);
      return;
    });
  },

  authenticate: function(authData, next) {
    if(!authData) {
      next(null);
      return;
    }
    var authParts = authData.split('|');
    var userId = authParts[0];
    var token = authParts[1];
    if (!userId || !token) {
      next(null);
      return;
    }
    this.authenticateRequest(userId, token, next);
  }
}


// class for publishing events over pub\sub channel.
function EventHandler(storage){
  this.storage = storage;
  this.channel =  'announce:event_listener';
}
EventHandler.prototype = {
  // serialize the data as a JSON string, and publish over
  // the channel. when done, call the callback function.
  emit: function(userId, clientChannel, data, next) {
    var msg = {
      type : 'user',
      userId : userId,
      channel : clientChannel,
      data : data
    }
    this.storage.publish(this.channel, JSON.stringify(msg), function() {
      if (next !== undefined)
        next();
    });
  },

  broadcast: function(clientChannel, data, next) {
    var msg = {
      type : 'broadcast',
      channel : clientChannel,
      data : data
    }
    this.storage.publish(this.channel, JSON.stringify(msg), function() {
      if (next !== undefined)
        next();
    });
  },

  broadcastGroup: function(groupName, clientChannel, data, next) {
    var msg = {
      type : 'group',
      groupName: groupName,
      channel : clientChannel,
      data : data
    }
    this.storage.publish(this.channel, JSON.stringify(msg), function() {
      if (next !== undefined)
        next();
    });
  },

  broadcastRoom: function(clientChannel, data, next) {
    var msg = {
      type : 'room',
      channel : clientChannel,
      data : data
    }
    this.storage.publish(this.channel, JSON.stringify(msg), function() {
      if (next !== undefined)
        next();
    });
  },
}


// setup an Express HTTP server to handle API requests.
// try and be at least quasi-RESTul.
function createAPIServer(storage){
  var auth = new AuthorizationHandler(storage);
  var handler = new EventHandler(storage);
  var internalServer = express.createServer(
    express.bodyParser() // provides JSON as req.body
  );

  // given a user ID, return a new token ID.
  internalServer.post('/auth/token/:userId', function(req, res) {
    auth.getToken(req.params.userId, function(token) {
      res.json({ token : token }, 201);
    });
  });

  // register a user to a group
  internalServer.post('/auth/group/:groupName/:userId', function(req, res) {
    var p = req.params;
    auth.registerToGroup(p.userId, p.groupName, function(created) {
      if (created) {
        res.send(201);
        return;
      }
      res.send(500);
    });
  });

  // unregister a user from a group
  internalServer.del('/auth/group/:groupName/:userId', function(req, res) {
    var p = req.params;
    auth.unregisterFromGroup(p.userId, p.groupName, function() {
      res.send(204);
    });
  });

  // given a user and a channel, emit on that user's active socket,
  // to the given channel, with the supplied data.
  internalServer.post('/emit/user/:userId/:channel', function(req, res) {
    var p = req.params;
    handler.emit(p.userId, p.channel, req.body, function() {
      res.send(204);
    });
  });

  // given a group and a channel, emit on that all group members' active socket,
  // to the given channel, with the supplied data.
  internalServer.post('/emit/group/:groupName/:channel', function(req, res) {
    var p = req.params;
    handler.broadcastGroup(p.groupName, p.channel, req.body, function() {
      res.send(204);
    });
  });

  // given a room name, emit on that all room members' active socket,
  // with the supplied data.
  internalServer.post('/emit/room/:roomName', function(req, res) {
    var p = req.params;
    handler.broadcastRoom(p.roomName, req.body, function(){
      res.send(204);
    });
  });

  // broadcast to all users on the given channel, with the supplied data.
  internalServer.post('/emit/broadcast/:channel', function(req, res) {
    var p = req.params;
    handler.broadcast(p.channel, req.body, function() {
      res.send(204);
    });
  });

  return internalServer;
}

// export API
module.exports.AuthorizationHandler = AuthorizationHandler;
module.exports.EventHandler = EventHandler;
module.exports.createAPIServer = createAPIServer;

