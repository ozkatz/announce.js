
function Room(roomName, storage) {
  this.roomName = roomName;
  this.storage = storage;
  this.key = 'announce:r/' + roomName;
  this.aliveKeyPrefix = 'announce:ping:r/' + roomName;
  this.statusChannel = this.roomName + '/stats';
  this.sockets = {};

  // start keep alive loop.
  this.keepAlive();
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
  },

  registerPing: function(user, userSockets) {
    var self = this;
    
    // add user to the set
    this.storage.sadd(this.key, user);
    
    // set sentinel for user, for 11 seconds.
    var userKey = this.generateKeyForUser(user);
    this.storage.set(userKey, 1);
    this.storage.expire(userKey, 11);
    
    // return active members and emit them to the user.
    this.getMembers(function(members){
      for (var i=0; i < userSockets.length; i++){
          var s = userSockets[i];
          s.emit(self.statusChannel, { users: members });
        }
    });
  },

  keepAlive: function() {
    var self = this;
    function doKeepAlive() {
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
        self.registerPing(userId, userSockets); 
      }
      // run every 5 seconds
      setTimeout(doKeepAlive, 5000);
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

