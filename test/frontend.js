var groups = require('../lib/socketgroups');
var utils = require('./utils');
var memoryBackend = require('../lib/storage/memory');
var frontend = require('../lib/frontend');
var api = require('../lib/api');
var io = require('socket.io-client'); // npm install socket.io-client

function authenticatedAmount(clients){
  var clientAmount = 0;
  for (c in clients) {
    clientAmount++;
  }
  return clientAmount;
}

module.exports = {
  'test frontend#handshake': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var auth = new api.AuthorizationHandler(storage);
    var fserver = frontend.createRealtimeServer(storage); 
    
    fserver.io.set('heartbeats', false);
    fserver.io.set('heartbeat timeout', 0);
  
    assert.equal(authenticatedAmount(fserver.authenticatedClients.clients), 0);
    fserver.server.listen(7782, function() {
      var socket = io.connect('http://localhost:7782');
      socket.on('announce-authentication-response', function(data) {
        assert.equal(data.status, 'success');
        assert.equal(authenticatedAmount(
          fserver.authenticatedClients.clients), 1
        );
      });
      auth.getToken('user1', function(t) {
        socket.emit('announce-authentication', { authString : 'user1|' + t });
      });
    });
  },
};