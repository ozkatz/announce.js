// mocking sockets.
function MockVolatile() {
  this.function_calls = {};
}
MockVolatile.prototype = {
  emit: function(channel, data) {
    if (this.function_calls.emit === undefined)
      this.function_calls.emit = [];
    this.function_calls.emit.push([channel, data]);
  }
}
function MockSocket() {
  this.function_calls = {};
  this.volatile = new MockVolatile();
  this.disconnected = false;
}
MockSocket.prototype = {
  emit: function(channel, data) {
    if (this.function_calls.emit === undefined)
      this.function_calls.emit = [];
    this.function_calls.emit.push([channel, data]);
  }
}

// mock out the io.sockets object
function MockSocketIO() {
  this.function_calls = {};
  this.volatile = new MockVolatile();
  this._sockets = [];
  this.length = 0;
}
MockSocketIO.prototype = {
  _addSocket: function(socket) {
    this._sockets.push(socket);
    this.length++;
  },
  emit: function(channel, data) {
    for (var i=0; i < this._sockets.length; i++) {
      var socket = this._sockets[i];
      socket.emit(channel, data);
    }
  },
}

module.exports.MockVolatile = MockVolatile;
module.exports.MockSocket = MockSocket;
module.exports.MockSocketIO = MockSocketIO;