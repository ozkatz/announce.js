
function Room(roomName, storage) {
  this.roomName = roomName;
  this.storage = storage;
  this.key = 'announce:r/' + roomName;
  this.aliveKeyPrefix = 'announce:ping:r/' + roomName;
  this.statusChannel = this.roomName + '/stats';
}
Room.prototype = {

  generateKeyForUser: function(user) {
    return this.aliveKeyPrefix + '/' + user;
  },
  
  getMembers: function(callback) {
    var self = this;
    self.storage.smembers(this.key, function(e, reply) {
      if (e || !reply || !reply.length) callback(new Array());
      var asyncCounter = 0;
      var members = new Array();
      
      reply.forEach(function(user){
        var userAlivekey = self.generateKeyForUser(user);
        
        self.storage.get(userAlivekey, function(e1, r1) {
          if (r1 === '1') {
            members.push(user);
          } else {
            self.storage.srem(self.key, user);
          }
          asyncCounter++;          
          if (asyncCounter == reply.length) {
            callback(members);
          }
        });

      });

    });
  },

  registerPing: function(user, callback) {
    var userKey = this.generateKeyForUser(user);
    this.storage.sadd(this.key, user);
    this.storage.set(userKey, 1);
    this.storage.expire(userKey, 11);
    this.getMembers(callback); // will return all active users.
  }
}
module.exports.Room = Room;