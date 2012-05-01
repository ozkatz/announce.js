var events = require('events');

// a very naive implementation of a set
var StringSet = function() {
  this.set = {};
}
StringSet.prototype = {
  add: function(o) {
    this.set[o] = true;
  },
  remove: function(o) {
    return ((o in this.set) && delete this.set[o]);
  },
  getMembers: function() {
    return Object.keys(this.set);
  }
}

function MemStorage(settings) {
  this.items = {};
  this.events = new events.EventEmitter();
  this.subscribing_channel = null;
}
MemStorage.prototype = {

  // regular key\value operations
  get: function(key, callback) {
    var val = this.items[key];
    if (val === undefined) {
      callback(new Error('key not found'), null);
      return;
    }
    if (typeof val != 'string') {
      callback(new Error('wrong kind of value'), null);
      return;
    }
    callback(null, val);
  },

  set: function(key, value, callback) {
    this.items[key] = value;
    if (callback)
      callback(null, true);
  },

  expire: function(key, secs) {
    var self = this;
    setTimeout(function() {
      delete self.items[key];
    }, secs * 1000);
  },


  getCreateSet: function(key) {
    // this could (and should) be improved.
    if (this.items[key] === undefined) {
      var set = this.items[key] = new StringSet();
    } else {
      var set = this.items[key];
    }
    return set;
  },
  sadd: function(key, value, callback) {
    var set = this.getCreateSet(key);
    if (!(set instanceof StringSet)) {
      if (callback !== undefined)
        callback(new Error('not a set'), null);
      return;
    }
    set.add(value);
    if (callback !== undefined)
      callback(null, true);
    return;
  },

  srem: function(key, value, callback) {
    var set = this.items[key];
    if (!(set instanceof StringSet)) {
      if (callback !== undefined)
        callback(new Error('not a set'), null);
      return;
    }
    set.remove(value);
    if (callback !== undefined)
      callback(null, true);
  },

  smembers : function(key, callback) {
    var set = this.items[key];
    if (!(set instanceof StringSet)) {
      callback(new Error('not a set'), null)
      return;
    }
    callback(null, set.getMembers());
  },


  hset: function(key, item, value) {
    var h = this.items[key];
    if (h === undefined) h = {};
    h[item] = value;
  },

  hdel: function(key, item) {
    var h = this.items[key];
    if (h === undefined) h = {};
    delete h[item];
  },


  // pub / sub
  publish: function(channel, data, callback) {
    this.events.emit(channel, data);
    if (callback !== undefined)
      callback(null, true);
    return;
  },

  subscribe: function(channel) {
    this.subscribing_channel = channel;
  },

  on: function(event, callback){
    var self = this;
    this.events.on(self.subscribing_channel, function(data) {
      callback(self.subscribing_channel, data);
    });
    return;
  },

}

module.exports.Storage = MemStorage;