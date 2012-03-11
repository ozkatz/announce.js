var groups = require('../lib/socketgroups');
var utils = require('./utils');

module.exports = {
  
  'test UserSockets#addSocket': function(beforeExit, assert) {
    var us = new groups.UserSockets();
    var s1 = new utils.MockSocket();
    us.addSocket(s1);
    assert.equal(us.sockets.length, 1);
  },

  'test UserSockets#removeSocket': function(beforeExit, assert) {
    var us = new groups.UserSockets();
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    us.addSocket(s1);
    us.addSocket(s2);
    assert.equal(us.sockets.length, 2);
    us.removeSocket(s1);
    assert.equal(us.sockets.length, 1);
  },

  'test UserSockets#emit': function(beforeExit, assert) {
    var us = new groups.UserSockets();
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    us.addSocket(s1);
    us.addSocket(s2);
    us.emit('my msg');
    assert.equal(s1.function_calls.emit.length, 1);
    assert.equal(s1.volatile.function_calls.emit, undefined);
    assert.equal(s2.function_calls.emit.length, 1);

    // volatile mode.
    us.emit('another msg', true);
    assert.equal(s1.function_calls.emit.length, 1);
    assert.equal(s1.volatile.function_calls.emit.length, 1);
    assert.equal(s2.function_calls.emit.length, 1);    
  },

  'test SocketGroup#addForClient': function(beforeExit, assert) {
    var sg1 = new groups.SocketGroup();
    
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    var s3 = new utils.MockSocket();
    var s4 = new utils.MockSocket();

    sg1.addForClient('user1', s1);
    sg1.addForClient('user1', s2);
    sg1.addForClient('user2', s3);
    sg1.addForClient('user2', s4);

    assert.equal(sg1.clients.user1.sockets.length, 2);
    assert.equal(sg1.clients.user2.sockets.length, 2);
  },

  'test SocketGroup#getClient': function(beforeExit, assert) {
    var sg1 = new groups.SocketGroup();
    
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    var s3 = new utils.MockSocket();
    var s4 = new utils.MockSocket();

    sg1.addForClient('user1', s1);
    sg1.addForClient('user1', s2);
    sg1.addForClient('user2', s3);
    sg1.addForClient('user2', s4);

    assert.equal(sg1.getClient('user1').sockets.length, 2);
    assert.equal(sg1.getClient('user2').sockets.length, 2);
    assert.equal(sg1.getClient('user3'), null);
  },

  'test SocketGroup#removeForClient': function(beforeExit, assert) {
    var sg1 = new groups.SocketGroup();
    
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    var s3 = new utils.MockSocket();
    var s4 = new utils.MockSocket();

    sg1.addForClient('user1', s1);
    sg1.addForClient('user1', s2);
    sg1.addForClient('user2', s3);
    sg1.addForClient('user2', s4);

    assert.equal(sg1.getClient('user1').sockets.length, 2);
    assert.equal(sg1.getClient('user2').sockets.length, 2);
    sg1.removeForClient('user1', s2);
    assert.equal(sg1.getClient('user1').sockets.length, 1);
    sg1.removeForClient('user1', s2);
    assert.equal(sg1.getClient('user1').sockets.length, 1);
    sg1.removeForClient('user2', s2);
    assert.equal(sg1.getClient('user2').sockets.length, 2);
    sg1.removeForClient('user5', s1);
    assert.equal(sg1.getClient('user1').sockets.length, 1);
  },

  'test SocketGroup#removeClient': function(beforeExit, assert) {
    var sg1 = new groups.SocketGroup();
    
    var s1 = new utils.MockSocket();
    var s2 = new utils.MockSocket();
    var s3 = new utils.MockSocket();
    var s4 = new utils.MockSocket();

    sg1.addForClient('user1', s1);
    sg1.addForClient('user1', s2);
    sg1.addForClient('user2', s3);
    sg1.addForClient('user2', s4);

    assert.equal(!!sg1.getClient('user1'), true);
    sg1.removeClient('user1');
    assert.equal(sg1.getClient('user1'), null);
  }
};