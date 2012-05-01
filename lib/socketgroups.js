// represents a collection of sockets that belong to a user.
// allows to emit to all of them without itterating every time.

function UserSockets() {
  this.sockets = new Array();
}
UserSockets.prototype = {

  addSocket: function(socket) {
    this.sockets.push(socket);
  },

  removeSocket: function(socket) {
    // remove from general socket collection
    var indexToRemove = this.sockets.indexOf(socket);
    if (indexToRemove != -1){
      this.sockets.splice(indexToRemove, 1);
    }

    // remove from rooms containing this socket
    for (roomName in this.rooms) {
      if (!this.rooms.hasOwnProperty(roomName)) return;
      var roomIndex = this.rooms[roomName].indexOf(socket);
      if (roomIndex != -1) {
        this.rooms[roomName].splice(roomIndex, 1);
        if (this.rooms[roomName].length == 0)
          delete this.cachedMembers[roomName];
      }
    }
  },

  emit: function(msg, isVolatile) {
    for(var i = 0; i < this.sockets.length; i++) {
      var socket = this.sockets[i];
      if (socket.disconnected) continue;
      if (isVolatile) {
        socket.volatile.emit(msg.channel, msg.data);
      } else {
        socket.emit(msg.channel, msg.data);
      }
    }
  }

}

// represents a collection of users
// easily get\add\remove clients from the group.
function SocketGroup(storage) {
  this.clients = {}
  this.storage = storage;
}
SocketGroup.prototype = {
  getClient: function(userId) {
    if (!(this.clients[userId])) {
      return null;
    }
    return this.clients[userId];
  },
  addForClient: function(userId, socket) {
    var client = this.getClient(userId);
    if(client){
      client.addSocket(socket);
    } else {
      client = new UserSockets();
      client.addSocket(socket);
      this.clients[userId] = client;
    }
    return client;
  },
  removeForClient: function(userId, socket) {
    var client = this.getClient(userId);
    if(client) {
      client.removeSocket(socket);
      if(client.sockets.length == 0)
        delete this.clients[userId];
    }
  },
  removeClient: function(userId) {
    delete this.clients[userId];
  }
}

module.exports.SocketGroup = SocketGroup;
module.exports.UserSockets = UserSockets;