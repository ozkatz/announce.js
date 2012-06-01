var groups = require('../lib/socketgroups');
var utils = require('./utils');
var memoryBackend = require('../lib/storage/memory');
var frontend = require('../lib/frontend');
var api = require('../lib/api');
var socketClient = require('socket.io-client'); // npm install socket.io-client

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
    var fserver = frontend.createRealtimeServer(storage, null, {
      // setting this to true fails the client. see: https://github.com/LearnBoost/socket.io/issues/793
      'match origin protocol' : false 
    }); 
    
    // fserver.io.set('heartbeats', true);
    // fserver.io.set('heartbeat timeout', 1);
  
    assert.equal(authenticatedAmount(fserver.authenticatedClients.clients), 0);
    fserver.server.listen(7782, function() {
      var client = socketClient.connect('http://localhost:7782');
      client.on('announce-authentication-response', function(data) {
        assert.equal(data.status, 'success');
        assert.equal(authenticatedAmount(
          fserver.authenticatedClients.clients), 1
        );
        client.on('disconnect', function() {
          fserver.server.close();
        });
        client.disconnect();
      });
      auth.getToken('user1', function(t) {
        client.emit('announce-authentication', { authString : 'user1|' + t });
      });
    });
  }
};