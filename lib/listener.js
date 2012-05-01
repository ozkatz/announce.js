var api = require('./api');
var rooms = require('./rooms');

// bind to pub/sub listener.
function bindEventListener(storage, io, authenticatedClients, isVolatile) {
  var auth = new api.AuthorizationHandler(storage);

  storage.subscribe('announce:event_listener');
  storage.on('message', function(channel, msg){
  msg = JSON.parse(msg);
  switch (msg.type) {
    // emit only to sockets that belong to a specific user
    case 'user':
      var client = authenticatedClients.getClient(msg.userId);
      if (client)
        client.emit(msg, isVolatile);
    break;

    // emit to all the connected sockets in the system.
    case 'broadcast':
      // broadcast to all sockets.
      if (!(io.sockets)) return;
      if (isVolatile) {
        io.sockets.volatile.emit(msg.channel, msg.data);
      } else {
        io.sockets.emit(msg.channel, msg.data);
      }
    break;

    // emit to all sockets of all the connected members of the group
    case 'group':
      // get all members of this group
      auth.getGroup(msg.groupName, function(list) {
        if (!list || list.length === undefined) return;
        for (var i = 0; i < list.length; i++) {
          // for each member, emit to it's socket
          var userId = list[i];
          var client = authenticatedClients.getClient(userId);
          if (client){
            client.emit(msg, isVolatile);
          }
        }
      });
    break;

    case 'room':
      var room = rooms.getRoom(msg.channel, storage);
      room.getMembers(function(members){
        members.forEach(function(member) {
          var client = authenticatedClients.getClient(member);
          if (client)
            client.emit(msg, isVolatile);
        });
      });
    break;
  }
  });
}
module.exports.bindEventListener = bindEventListener;