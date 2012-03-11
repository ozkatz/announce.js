/* announce.client.js 0.1.0 */
var announce = (function(){
    
    // define the crier client class
    function AnnounceClient(){
        this.callbacks = [];
    }
    AnnounceClient.prototype = {

        getCookie : function(name) {
            name = name + "=";
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
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
            for (var i=0; i< scripts.length; i++){
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

        init : function(callback){
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
            });

            return this;
        }
    }
    // return a new instance of it.
    return new AnnounceClient();
})();