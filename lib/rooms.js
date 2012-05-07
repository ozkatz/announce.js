
function Room(roomName, storage) {
  this.roomName = roomName;
  this.storage = storage;
  this.key = 'announce:r/' + roomName;
  this.aliveKeyPrefix = 'announce:ping:r/' + roomName;
  this.statusChannel = this.roomName + '/stats';
  this.sockets = {};
  
  this.keepAliveRunning = false;
  this.pollingInterval = 2; // poll room members every 2 secs.
  this._member_cache = null;

  // start keep alive loop.
  //this.keepAlive();
}
Room.prototype = {

  generateKeyForUser: function(user) {
    return this.aliveKeyPrefix + '/' + user;
  },
  
  getMembers: function(callback) {
    var self = this;
    self.storage.smembers(this.key, function(e, reply) {
      if (e || !reply || !reply.length) callback(new Array());
      var asyncCounter = 0;
      var members = new Array();
      
      reply.forEach(function(user){
        var userAlivekey = self.generateKeyForUser(user);
        
        self.storage.get(userAlivekey, function(e1, r1) {
          if (r1 === '1') {
            members.push(user);
          } else {
            self.storage.srem(self.key, user);
          }
          asyncCounter++;          
          if (asyncCounter == reply.length) {
            callback(members);
          }
        });

      });

    });
  },

  registerSocket: function(socket, userId) {
    if (this.sockets[userId] === undefined)
      this.sockets[userId] = new Array();
    this.sockets[userId].push(socket);
    
    // emit the current list of members.
    var members = this.getCachedMembers();
    if (members && members.length){
      socket.emit(this.statusChannel, { users: members });
    }

    this.keepAlive();
  },

  registerPing: function(user) {
    var self = this;
    
    // add user to the set
    this.storage.sadd(this.key, user);
    
    // set sentinel for user, for 5 seconds.
    var userKey = this.generateKeyForUser(user);
    this.storage.set(userKey, 1);
    this.storage.expire(userKey, this.pollingInterval * 2 + 1);
  },

  cacheMembers: function(members) {
    this._member_cache = members;
  },

  clearMemberCache: function() {
    this._member_cache = new Array();
  },

  getCachedMembers: function() { 
    return this._member_cache;
  },

  membersCacheEquals: function(members) {
    if (!this._member_cache || !this._member_cache.length) return false;
    if (this._member_cache.length != members.length) return false;
    for (var i=0; i < members.length; i++){
      if (this._member_cache.indexOf(members[i]) == -1) return false;
    }
    return true;
  },

  keepAlive: function() {
    var self = this;
    if (self.keepAliveRunning) return; // run loop only if it isn't running.
    self.keepAliveRunning = true;
    
    function doKeepAlive() {
      var connectedSockets  = new Array();
      for (userId in self.sockets) {
        var userSockets = self.sockets[userId];
        
        // clear disconnected sockets
        var socketsToClear = new Array();
        for (var i=0; i < userSockets.length; i++){
          var s = userSockets[i];
          if(s.disconnected) {
            socketsToClear.push(s);
          }
        }
        for (var i=0; i < socketsToClear.length; i++){
          var s = socketsToClear[i];
          userSockets.splice(s, 1);
        }

        // if user has no sockets, remove him.
        if (userSockets.length == 0) {
          delete self.sockets[userId];
          continue;
        }

        // for those with still active sockets, ping, and emit members list.  
        self.registerPing(userId);
        connectedSockets = connectedSockets.concat(userSockets);
      }

      if (connectedSockets.length == 0){
        self.clearMemberCache();
        self.keepAliveRunning = false;
        return;
      } else {
        self.keepAliveRunning = true;
      }

      // return active members and emit them to connected sockets
      self.getMembers(function(members){
        if (self.membersCacheEquals(members)) return; // in the same is last itteration.
        for (var i=0; i < connectedSockets.length; i++){
          var s = connectedSockets[i];
          s.emit(self.statusChannel, { users: members });
        }
        self.cacheMembers(members);
      });

      // run every 2 seconds
      setTimeout(doKeepAlive, self.pollingInterval * 1000);
    }
    doKeepAlive();
  }
}

_rooms = new Array();
function getRoom(roomName, storage) {
  for (var i=0; i < _rooms.length; i++) {
    var currentRoom = _rooms[i];
    if (currentRoom.roomName == roomName)
      return currentRoom;
  }

  var room = new Room(roomName, storage);
  _rooms.push(room);
  return room;
}
module.exports.getRoom = getRoom;

