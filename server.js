// imports. please see package.json for required dependencies.
// install all dependencies with `npm install`.
var fs = require('fs');
var config = require('config');
var api = require('./lib/api');
var frontend = require('./lib/frontend');
var listener = require('./lib/listener');

// initialize settings with some default values.
var volatileDefined = (config.sockets_volatile === undefined);
var settings = {
  storage : config.storage_type || 'redis', // redis is on by default.
  redisHost : config.redis_host || 'localhost',
  redisPort : config.redis_port || 6379,
  apiHost : config.api_host || 'localhost',
  apiPort : config.api_port || 6600, 
  socketHost : config.socket_host || '0.0.0.0',
  socketPort : config.socket_port || 5500,
  sslKey : config.ssl_key || null,
  sslCert : config.ssl_certificate || null,
  isVolatile : (volatileDefined) ? false : config.sockets_volatile
}

// get a storage instance
if (settings.storage == 'redis') {
  console.log('storage backend: Redis');
  var storageBackend = require('./lib/storage/redis');
} else if (settings.storage = 'mem' || settings.storage == 'memory') {
  console.log('storage backend: local memory');
  var storageBackend = require('./lib/storage/memory');
} else {
  console.log('storage backend must be either "redis" or "mem".');
  process.exit(1);
}

var storage = new storageBackend.Storage(settings);

// initialize the internal API server
var apiServer = api.createAPIServer(storage);
apiServer.listen(settings.apiPort, settings.apiHost);
console.log('Started API server on host: ' +
  settings.apiHost +', port: ' + settings.apiPort);

// check if SSL is required
if (settings.sslKey !== null && settings.sslCert !== null) {
  console.log('Running socket.IO in SSL mode');
  var sslOptions = {
    key : fs.readFileSync(settings.sslKey),
    cert : fs.readFileSync(settings.sslCert)
  };
  var frontEndServer = frontend.createRealtimeServer(
    storage, sslOptions
  );
} else {
  var frontEndServer = frontend.createRealtimeServer(
    storage
  );
}

// initialize the external socket.io server
frontEndServer.server.listen(settings.socketPort, settings.socketHost);
console.log('Started socket.io API on host: ' +
  settings.socketHost +', port: ' + settings.socketPort);

// start listening on events
listener.bindEventListener(
  storage,
  frontEndServer.io,
  frontEndServer.authenticatedClients,
  settings.isVolatile
);
console.log('Started pub/sub listener');


