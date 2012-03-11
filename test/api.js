var api = require('../lib/api');
var memoryBackend = require('../lib/storage/memory');

var storage = new memoryBackend.Storage({});
var auth = new api.AuthorizationHandler(storage);
var handler = new api.EventHandler(storage);

module.exports = {

  // test authorization handler
  'test auth#getToken': function(beforeExit, assert) {
    auth.getToken('user1', function(t) {
      assert.ok(!!t);
      auth.getToken('user1', function(t1) {
        assert.equal(t, t1);
        auth.getToken('user2', function(t2) {
          assert.notEqual(t1, t2);
        });
      });
    });
  },

  'test auth#registerToGroup': function(beforeExit, assert) {
    auth.registerToGroup('user1', 'group1', function(success) {
      assert.ok(success);
      auth.getGroup('group1', function(g) {
        assert.equal(g.toString(), 'user1');
        auth.registerToGroup('user1', 'group1', function(success) {
          assert.ok(success);
          auth.getGroup('group1', function(g) {
            assert.equal(g.toString(), 'user1');
            auth.registerToGroup('user2', 'group1', function(success) {
              assert.ok(success);
              auth.getGroup('group1', function(g) {
                assert.equal(g.toString(), 'user1,user2');
              });
            });
          });
        });
      });
    });
  },

  'test auth#unregisterFromGroup': function(beforeExit, assert) {
    auth.getGroup('group1', function(g) {
      assert.equal(g.toString(), 'user1,user2');
      auth.unregisterFromGroup('user1', 'group1', function() {
        auth.getGroup('group1', function(g) {
          assert.equal(g.toString(), 'user2');
        });
      });
    });
  },

  'test auth#authenticate': function(beforeExit, assert) {
    auth.getToken('user1', function(t) {
      auth.authenticate('user1|' + t, function(userId) {
        assert.equal(userId, 'user1');
      });
      auth.authenticate('user2|' + t, function(userId) {
        assert.equal(userId, null);
      });
      auth.authenticate('randomstring', function(userId) {
        assert.equal(userId, null);
      });
      auth.authenticate('rand|om|str|ing', function(userId) {
        assert.equal(userId, null);
      });
    });
  },

  // test event handler
  'test handler#emit': function(beforeExit, assert) {
    var testData = {first : 'Oz', last: 'Katz'};
    
    var emitReceived = 0;
    storage.subscribe(handler.channel);
    storage.on('message', function(chl, d){
      emitReceived++;
      d = JSON.parse(d);
      assert.equal(d.type, 'user');
      assert.equal(d.userId, 'user1');
      assert.equal(d.channel, 'test:channel1');
      assert.equal(d.data.first, 'Oz');
      assert.equal(d.data.last, 'Katz');
    });

    var emitCallbacks = 0;
    handler.emit('user1', 'test:channel1', testData, function() {
      emitCallbacks++;
    });

    beforeExit(function() {
      assert.equal(emitCallbacks, 1);
      assert.equal(emitReceived, 1);
    });
  },

  'test handler#broadcast': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var handler = new api.EventHandler(storage);
    
    var testData = {first : 'Oz', last: 'Katz'};
    
    var broadcastsReceived = 0;
    storage.subscribe(handler.channel);
    storage.on('message', function(chl, d){
      broadcastsReceived++;
      d = JSON.parse(d);
      assert.equal(d.type, 'broadcast');
      assert.equal(d.userId, undefined);
      assert.equal(d.channel, 'test:channel1');
      assert.equal(d.data.first, 'Oz');
      assert.equal(d.data.last, 'Katz');
    });

    var broadcastCallbacks = 0;
    handler.broadcast('test:channel1', testData, function() {
      broadcastCallbacks++;
    });

    beforeExit(function() {
      assert.equal(broadcastCallbacks, 1);
      assert.equal(broadcastsReceived, 1);
    });
  },

  'test handler#broadcastGroup': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var handler = new api.EventHandler(storage);
    
    var testData = {first : 'Oz', last: 'Katz'};
    
    var broadcastsReceived = 0;
    storage.subscribe(handler.channel);
    storage.on('message', function(chl, d){
      broadcastsReceived++;
      d = JSON.parse(d);
      assert.equal(d.type, 'group');
      assert.equal(d.userId, undefined);
      assert.equal(d.groupName, 'g1');
      assert.equal(d.channel, 'test:channel1');
      assert.equal(d.data.first, 'Oz');
      assert.equal(d.data.last, 'Katz');
    });

    var broadcastCallbacks = 0;
    handler.broadcastGroup('g1', 'test:channel1', testData, function() {
      broadcastCallbacks++;
    });

    beforeExit(function() {
      assert.equal(broadcastCallbacks, 1);
      assert.equal(broadcastsReceived, 1);
    });
  },

  // test API server
  'test apiServer#token': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var auth = new api.AuthorizationHandler(storage);
    server = api.createAPIServer(storage);
    assert.response(server, {
      url: '/auth/token/user1',
      method: 'POST'
    }, {
      status: 201,
    }, function(res) {
      var body = JSON.parse(res.body);
      assert.equal(!!body.token, true);
      auth.getToken('user1', function(token) {
        assert.equal(body.token, token);
      });

    });
  },

  'test apiServer#registerToGroup': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var auth = new api.AuthorizationHandler(storage);
    server = api.createAPIServer(storage);
    assert.response(server, {
      url: '/auth/group/g1/user1',
      method: 'POST'
    }, {
      status: 201,
    }, function(res) {
      auth.getGroup('g1', function(gm) {
        assert.equal(gm.toString(), 'user1');
      });
    });
  },

  'test apiServer#unregisterFromGroup': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var auth = new api.AuthorizationHandler(storage);
    server = api.createAPIServer(storage);
    auth.registerToGroup('user1', 'g1', function() {
      assert.response(server, {
        url: '/auth/group/g1/user1',
        method: 'DELETE'
      }, {
        status: 204,
      }, function(res) {
        auth.getGroup('g1', function(gm) {
          assert.equal(gm.toString(), '');
        });
      });
    });
  },

  'test apiServer#emit': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var handler = new api.EventHandler(storage);
    var auth = new api.AuthorizationHandler(storage);

    var emitReceived = 0;
    storage.subscribe(handler.channel);
    storage.on('message', function(chl, d) {
      emitReceived++;
      d = JSON.parse(d);
      assert.equal(d.type, 'user');
      assert.equal(d.userId, 'u1');
      assert.equal(d.channel, 'c1');
      assert.equal(d.data.first, 'Oz');
      assert.equal(d.data.last, 'Katz');
    });

    server = api.createAPIServer(storage);
    assert.response(server, {
      url: '/emit/user/u1/c1',
      method: 'POST',
      headers: {'Content-Type': 'application/json; charset=utf-8'},
      data: '{ "first": "Oz", "last": "Katz"}'
    }, {
      status: 204,
    }, function(res) {});

    beforeExit(function() {
      assert.equal(emitReceived, 1);
    });
  },

  'test apiServer#emitGroup': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var handler = new api.EventHandler(storage);
    var auth = new api.AuthorizationHandler(storage);

    var emitReceived = 0;
    storage.subscribe(handler.channel);
    storage.on('message', function(chl, d) {
      emitReceived++;
      d = JSON.parse(d);
      assert.equal(d.type, 'group');
      assert.equal(d.groupName, 'g1');
      assert.equal(d.channel, 'c2');
      assert.equal(d.data.first, 'Oz');
      assert.equal(d.data.last, 'Katz');
    });

    server = api.createAPIServer(storage);
    assert.response(server, {
      url: '/emit/group/g1/c2',
      method: 'POST',
      headers: {'Content-Type': 'application/json; charset=utf-8'},
      data: '{ "first": "Oz", "last": "Katz"}'
    }, {
      status: 204,
    }, function(res) {});

    beforeExit(function() {
      assert.equal(emitReceived, 1);
    });
  },

  'test apiServer#emitBroadcast': function(beforeExit, assert) {
    var storage = new memoryBackend.Storage({});
    var handler = new api.EventHandler(storage);
    var auth = new api.AuthorizationHandler(storage);

    var emitReceived = 0;
    storage.subscribe(handler.channel);
    storage.on('message', function(chl, d) {
      emitReceived++;
      d = JSON.parse(d);
      assert.equal(d.type, 'broadcast');
      assert.equal(d.groupName, undefined);
      assert.equal(d.channel, 'c2');
      assert.equal(d.data.first, 'Oz');
      assert.equal(d.data.last, 'Katz');
    });

    server = api.createAPIServer(storage);
    assert.response(server, {
      url: '/emit/broadcast/c2',
      method: 'POST',
      headers: {'Content-Type': 'application/json; charset=utf-8'},
      data: '{ "first": "Oz", "last": "Katz"}'
    }, {
      status: 204,
    }, function(res) {});

    beforeExit(function() {
      assert.equal(emitReceived, 1);
    });
  },

};