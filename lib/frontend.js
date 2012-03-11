var socketio = require('socket.io');
var express = require('express');
var api = require('./api');
var groups = require('./socketgroups');

// bind an Express server and use it to serve socket.io requests.
function createRealtimeServer(storage, sslOptions) {

  // keep a mapping of user IDs to their respective sockets.
  // sockets are added on connection, and removed on disconnect.
  var authenticatedClients = new groups.SocketGroup();

  // if SSL options are set, use them to set this server up with
  // SSL encryption.
  if (sslOptions)
    var server  = express.createServer(sslOptions);
  else
    var server  = express.createServer();
  
  // serve clientside code
  server.use('/client', express.static(__dirname + '/../client'));

  var io = socketio.listen(server);
  io.set('log level', 1); // disable logging debug messages.  

  var auth = new api.AuthorizationHandler(storage);

  function setupConnection(socket) {
    socket.on('announce-authentication', function(authData) {
      // validate token and authorize user
      auth.authenticate(authData.authString, function(userId){
        if (!userId) {
          socket.emit('announce-authentication-response', {
            status : 'failed'
          });
          return;
        }
        authenticatedClients.addForClient(userId, socket);
        // return a response saying connection is successful.
        socket.emit('announce-authentication-response' , {
          status : 'success'
        });
        
        // set a disconnect handler to remove the current socket
        // from the list of sockets for this client
        socket.on('disconnect', function() {
          // on disconnect, remove user ID <--> socket mapping.
          authenticatedClients.removeForClient(userId, socket);
        });
      });
    });
  }

  io.sockets.on('connection', setupConnection);
  return {
    server : server,
    authenticatedClients : authenticatedClients,
    createRealtimeServer : createRealtimeServer,
    io : io
  };
}

// since we wrapped everything in a namespace,
// export only it.
module.exports.createRealtimeServer = createRealtimeServer;
