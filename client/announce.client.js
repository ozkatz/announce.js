/* announce.client.js 0.1.3 */
var announce = (function(){

    // rooms
    function Room(roomName){
        this.roomName = roomName;
        this.statusChannel = this.roomName + '/stats';
        this.msgCallbacks = new Array();
        this.statusCallbacks = new Array();
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

        joinRoom : function(socket) {
            var self = this;
            self.socket.emit('announce-room-join', {
                roomName : self.roomName
            });
        },

        init : function(socket){
            var self = this;
            if (this.socket == socket){
                self.joinRoom();
                return;
            }
            self.socket = socket;
            self.socket.on(self.statusChannel, function(data){
                self.updateStatus(data);
            });
            self.socket.on(self.roomName, function(data){
                self.addMessage(data);
            });
            self.joinRoom();
        }
    }

    // define the crier client class
    function AnnounceClient(){
        this.callbacks = new Array();
        this.initCallbacks = new Array();
        this.rooms = new Array();
        this.socket = null;
        this.connectionAttempt = 0;
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
            function cb(socket){
                socket.on(channel, callback);
            }
            this.callbacks.push(cb);

            if (this.socket) cb(this.socket); // if already connected, bind.
            return this;
        },

        bind: function(callback) {
            this.initCallbacks.push(callback);
            if (this.socket) callback(this.socket);
        },

        joinRoom : function(roomName){
            var r = new Room(roomName);
            this.rooms.push(r);

            if (this.socket) r.init(this.socket);
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
                self.connectionAttempt++;
                socket.emit('announce-authentication', {
                    authString : announceToken
                });
            });

            // log response
            socket.on('announce-authentication-response', function(data){
                if (data.status != 'success'){
                    return;
                }
                self.socket = socket;
                //if (self.connectionAttempt > 1) return;

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

                // call the init callback
                for (var i=0; i < self.initCallbacks.length; i++) {
                    var cb = self.initCallbacks[i];
                    cb(socket);
                }
            });

            return this;
        }
    }
    var announce = new AnnounceClient();
    return announce;
})();