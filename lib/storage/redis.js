var redis = require('redis');

function RedisStorage(settings) {
  this.connection = redis.createClient(
    settings.redisPort, settings.redisHost
  );
  // once a redis connection runs subscribe(), it will be in pub\sub mode.
  // that means it will only be useful for receiving events, so we need to store
  // two redis connections.
  this.pubsub = redis.createClient(settings.redisPort, settings.redisHost);
  if (settings.redisPassword) {
    this.connection.auth(settings.redisPassword);
    this.pubsub.auth(settings.redisPassword);
  }
}
RedisStorage.prototype = {

  // regular key\value operations
  get: function(key, callback) {
    return this.connection.get(key, callback);
  },
  set: function(key, value, callback) {
    return this.connection.set(key, value, callback);  
  },
  expire: function(key, secs) {
    return this.connection.expire(key, secs);
  },

  sadd: function(key, value, callback) {
    return this.connection.sadd(key, value, callback);
  },
  srem: function(key, value, callback) {
    return this.connection.srem(key, value, callback);
  },
  smembers: function(key, callback) {
    return this.connection.smembers(key, callback);
  },

  hset: function(key, item, value) {
    return this.connection.hset(key, item, value);
  },
  hdel: function(key, item) {
    return this.connection.hdel(key, item);
  },

  // pub\sub operations
  publish: function(channel, data, callback) {
    return this.connection.publish(channel, data, callback);
  },
  subscribe: function(channel) {
    return this.pubsub.subscribe(channel);
  },
  on: function(event, callback) {
    return this.pubsub.on(event, callback);
  }

}

module.exports.Storage = RedisStorage;
