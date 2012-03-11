var memoryBackend = require('../lib/storage/memory');

// utility class for testing storage operations.
function StorageOpertaion(assert){
  this.assert = assert;
  this.success_counter = 0;
  this.failure_counter = 0;
}
StorageOpertaion.prototype = {
  
  success : function(expectedValue) {
    var self = this;
    if (expectedValue === undefined)
      expectedValue = 'true';
    return function(err, reply){
      self.assert.equal(err, null);
      self.assert.equal(reply.toString(), expectedValue);
      self.success_counter++;
    }
  },

  failure : function(errContains) {
    var self = this;
    return function(err, reply){
      if (errContains === undefined) {
        self.assert.equal(!!err, true);
      } else {
        self.assert.notEqual(err.message.indexOf(errContains), -1);
      }
      self.assert.equal(reply, null);
      self.failure_counter++;
    }
  }
}


// test memory storage backend.
var mem = new memoryBackend.Storage({});

function storageTests(backend){
  return {
    'test Storage#set': function(beforeExit, assert) {
      var cb = new StorageOpertaion(assert);

      backend.set('k1', 'v1', cb.success());
      beforeExit(function() {
        assert.equal(1, cb.success_counter);
      });
    },

    'test Storage#get': function(beforeExit, assert) {
      var cb = new StorageOpertaion(assert);

      backend.get('k1', cb.success('v1'));
      backend.get('k200', cb.failure());
      
      backend.sadd('kgs1', 'v');
      backend.get('kgs1', cb.failure());
      
      beforeExit(function() {
        assert.equal(1, cb.success_counter);
        assert.equal(2, cb.failure_counter);
      });
    },

    'test Storage#sadd': function(beforeExit, assert) {
      var cb = new StorageOpertaion(assert);

      backend.sadd('ks1', 'a', cb.success());
      backend.sadd('ks1', 'a', cb.success());
      backend.sadd('ks1', 'b', cb.success());
      backend.sadd('ks1', 'c', cb.success());
      backend.sadd('k1', 'd', cb.failure('set'));
      
      beforeExit(function() {
        assert.equal(4, cb.success_counter);
        assert.equal(1, cb.failure_counter);
      });
    },

    'test Storage#smembers': function(beforeExit, assert) {
      var cb = new StorageOpertaion(assert);

      backend.smembers('ks1', cb.success('a,b,c'));
      backend.smembers('k1', cb.failure('set'));
      
      beforeExit(function() {
        assert.equal(1, cb.success_counter);
        assert.equal(1, cb.failure_counter);
      });
    }, 

    'test Storage#srem': function(beforeExit, assert) {
      var cb = new StorageOpertaion(assert);

      backend.srem('ks1','a' ,function(e,r) {
        cb.success()(e,r);
        backend.smembers('ks1', cb.success('b,c'));
      });

      beforeExit(function() {
        assert.equal(2, cb.success_counter);
        assert.equal(0, cb.failure_counter);
      });
    },

    'test Storage#publish': function(beforeExit, assert) {
      var cb = new StorageOpertaion(assert);

      backend.publish('channel:test', 'data', cb.success());
      beforeExit(function() {
        assert.equal(1, cb.success_counter);
        assert.equal(0, cb.failure_counter);
      });
    },

    'test Storage#subscribe': function(beforeExit, assert) {
      backend.subscribe('channel:test');
      beforeExit(function() {
        assert.equal(backend.subscribing_channel, 'channel:test');
      });
    },

    'test Storage#on': function(beforeExit, assert) {
      backend.subscribe('channel:test');
      
      var messageCounter = 0;
      backend.on('message', function(channel, data) {
        assert.equal(data, 'some data');
        messageCounter++;
      });
      
      backend.publish('channel:test', 'some data');
      
      beforeExit(function() {
        assert.equal(backend.subscribing_channel, 'channel:test');
        assert.equal(messageCounter, 1);
      });
    },
  };
}

module.exports = storageTests(mem);