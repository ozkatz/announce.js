var io = require('socket.io');
var utils = require('./utils');

var api = require('../lib/api')
var groups = require('../lib/socketgroups');
var listener = require('../lib/listener');
var memoryBackend = require('../lib/storage/memory');


module.exports = {
  'test listener#emit': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var handler = new api.EventHandler(storage);

    var sg1 = new groups.SocketGroup();
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    var s3 = new utils.MockSocket();
    var s4 = new utils.MockSocket();
    var s5 = new utils.MockSocket();

    sg1.addForClient('user1', s1);
    sg1.addForClient('user1', s2);
    sg1.addForClient('user2', s3);
    sg1.addForClient('user2', s4);
    sg1.addForClient('user3', s5);

    listener.bindEventListener(storage, io, sg1, false);

    var testData = {first : 'Oz', last: 'Katz'};
    handler.emit('user1', 'test:channel1', testData);

    beforeExit(function() {
      var c = sg1.getClient('user1');
      totalEmits = 0;
      for (var i=0; i < c.sockets.length; i++) {
        var s = c.sockets[i];
        totalEmits += s.function_calls.emit.length;
      }
      assert.equal(totalEmits, 2);
    });
  },

  'test listener#emitGroup': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var handler = new api.EventHandler(storage);
    var auth = new api.AuthorizationHandler(storage);

    var sg1 = new groups.SocketGroup();
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    var s3 = new utils.MockSocket();
    var s4 = new utils.MockSocket();
    var s5 = new utils.MockSocket();

    sg1.addForClient('user1', s1);
    sg1.addForClient('user1', s2);
    sg1.addForClient('user2', s3);
    sg1.addForClient('user2', s4);
    sg1.addForClient('user3', s5);
    var callCounter = 0;

    listener.bindEventListener(storage, io, sg1, false);

    var testData = {first : 'Oz', last: 'Katz'};
    auth.registerToGroup('user1', 'g1', function() {
      auth.registerToGroup('user2', 'g1', function() {
        handler.broadcastGroup('g1', 'test:channel1', testData, function() {
          auth.getGroup('g1', function(g) {
            for (var i=0; i < g.length; i++) {
              var u = sg1.getClient(g[i]);
              for (var j=0; j < u.sockets.length; j++) {
                s = u.sockets[j];
                callCounter += s.function_calls.emit.length;
              }
            }
            assert.equal(callCounter, 4);
          });
        });
      });
    });
  },

  'test listener#broadcast': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var handler = new api.EventHandler(storage);
    var auth = new api.AuthorizationHandler(storage);

    var sg1 = new groups.SocketGroup();    
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    var s3 = new utils.MockSocket();
    var s4 = new utils.MockSocket();
    var s5 = new utils.MockSocket();

    sg1.addForClient('user1', s1);
    sg1.addForClient('user1', s2);
    sg1.addForClient('user2', s3);
    sg1.addForClient('user2', s4);
    sg1.addForClient('user2', s5);

    io.sockets = new utils.MockSocketIO(); // mock out the sockets collection.
    io.sockets._addSocket(s1);
    io.sockets._addSocket(s2);
    io.sockets._addSocket(s3);
    io.sockets._addSocket(s4);
    io.sockets._addSocket(s5);
    var callCounter = 0;

    listener.bindEventListener(storage, io, sg1, false);

    var testData = {first : 'Oz', last: 'Katz'};
    handler.broadcast('test:channel1', testData, function() {
      for (var i=0; i < io.sockets.length; i++){
        var socket = io.sockets._sockets[i];
        callCounter += socket.function_calls.emit.length;
      }
      assert.equal(callCounter, 5);
    });
  }

};