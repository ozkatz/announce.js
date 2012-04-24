/* announce.client.js 0.1.3 */
var announce = (function(){

    // rooms
    function Room(roomName){
        this.roomName = roomName;
        this.statusChannel = this.roomName + '/stats';
        this.msgCallbacks = new Array();
        this.statusCallbacks = new Array();

        this.pingInterval = 5000;
        this.socket = null;
    }
    Room.prototype = {

        onMessage : function(callback) {
            this.msgCallbacks.push(callback);
            return this;
        },

        onStatusUpdate : function(callback) {
            this.statusCallbacks.push(callback);
            return this;
        },

        addMessage : function(msg) {
            for (var i=0; i < this.msgCallbacks.length; i++) {
                var callback = this.msgCallbacks[i];
                callback(msg);
            }
        },

        updateStatus : function(msg) {
            for (var i=0; i < this.statusCallbacks.length; i++) {
                var callback = this.statusCallbacks[i];
                callback(msg);
            }
        },

        pingAway : function(socket) {
            var self = this;
            socket.emit('announce-room-ping', {roomName : self.roomName});
            setTimeout(function(){
                self.pingAway(socket);
            }, self.pingInterval);
        },

        init : function(socket){
            var self = this;
            socket.on(this.statusChannel, function(data){
                self.updateStatus(data);
            });
            socket.on(this.roomName, function(data){
                self.addMessage(data);
            });
            this.pingAway(socket);
        }
    }

    // define the crier client class
    function AnnounceClient(){
        this.callbacks = [];
        this.rooms = [];
    }
    AnnounceClient.prototype = {

        getCookie : function(name) {
            name = name + "=";
            var cookies = document.cookie.split(';');
            for (var i=0; i < cookies.length; i++) {
                var cookie = cookies[i];
                while (cookie.charAt(0) == ' '){
                    cookie = cookie.substring(1, cookie.length);
                }
                if (cookie.indexOf(name) == 0){
                    return cookie.substring(name.length, cookie.length);  
                } 
            }
            return null;
        },

        getAnnounceCookie : function(){
            return this.getCookie('announceToken');
        },

        getServerPath : function(){
            // this entire function is a terrible hack.
            // we use it to get the server path.
            var scripts = document.getElementsByTagName('script');
            var clientTag;
            for (var i=0; i < scripts.length; i++){
                var src = scripts[i].getAttribute('src');
                if (src){
                    var resourceLoc = src.indexOf('/client/announce.client.js');
                    if(resourceLoc != -1){
                        // cut the part before it
                        return src.substring(0, resourceLoc);
                    }
                }
            }
            return null;
        },

        requestIsSecure : function(serverAddr) {
            return (serverAddr.indexOf('https') == 0);
        },

        // add the callback function to the array
        // ov callbacks to run on successful connection
        on : function(channel, callback){
            this.callbacks.push(function(socket){
                socket.on(channel, callback);
            });
            return this;
        },

        joinRoom : function(roomName){
            var r = new Room(roomName);
            this.rooms.push(r);
            return r
        },

        init : function(callback){
            var self = this;
            // create a connection
            var announceToken = this.getAnnounceCookie();
            var callbacks = this.callbacks;
            if (announceToken == null) return;

            var socketServer = this.getServerPath();
            if (!socketServer){
                // auto discovery. Don't count on this working.
                var socket = io.connect();
            } else {
                // check if HTTPS is on
                if (this.requestIsSecure(socketServer)) {
                    var socket = io.connect(socketServer, { secure: true });
                } else {
                    var socket = io.connect(socketServer);
                }
            }
            
            // authenticate with the token
            socket.on('connect', function(){
                socket.emit('announce-authentication', {
                    authString : announceToken
                });
            });

            // log response
            socket.on('announce-authentication-response', function(data){
                if (data.status != 'success'){
                    return;
                }
                // call the callback functions.
                for(var i=0; i < callbacks.length; i++){
                    var cb = callbacks[i];
                    cb(socket);
                }
                // initialize rooms
                for (var i=0; i < self.rooms.length; i++){
                    var room = self.rooms[i];
                    room.init(socket);
                }
            });

            return this;
        }
    }
    var announce = new AnnounceClient();
    return announce;
})();