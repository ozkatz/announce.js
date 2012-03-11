# Announce.js

announce.js is node.js + socket.io server used for adding real-time push notifications to your existing web application.

## what does that mean exactly? 

Say you have an awesome web app you developed in Django\Rails\PHP\Perl\Java\Bash\Awk.
You one day wake up and decide you want to add support for push (real-time) notifications.
Sure, you can run periodic AJAX calls, do long-polling, or utilize WebSockets yourself.
But that's a lot of work, and that's what [Socket.IO](http://socket.io/ "Socket.IO") is for.

announce.js lets you seamlessly (well, almost) integrate your existing framework with the power of node and socket.io.
just install it, add the proper client for your web framework of choice (currently, it's Django only),
and send those realtime messages from your own code, in your own language, inside your own views.

## Awesome, How does it work?

Well, it's basically a proxy server. when your web app calls Announce.js, it does so over an internal HTTP API.
On the client side, your client is also connected to the announce.js sever, using socket.io.
So when you, inside your webapp, send a request (lets say, send a message "you rock!" to user A)
the announce.js API takes that request, looks the appropriate socket for a client called "A", and emits
that message. that's the basic workflow.

## Dependencies

Announce.js requires the following software installed and configured:

* [Node.js](http://nodejs.org/ "Node.js")
* [NPM](http://npmjs.org/ "NPM") (automatically installs all 3rd party libraries this project depends on.)
* [Redis](http://redis.io/ "Redis") (optional, but highly recommended. see *Configuration* below).


## Installation

installing is pretty simple.

```bash
npm install announce.js
```


## Run the server

```bash
node node_modules/announce.js/server.js
```


## Configuration

Configuring announce is done by creating a json file inside `announce.js/config/`.
the name of that file should be `<environment name>.json`. where `<environment name>` is replaced
by the value of the environment variable `NODE_ENV`. If it isn't set, the default would be `development.json`.
to run with anything else (say, production) start your node server like this:

```bash
NODE_ENV=production node server.js
```

For most cases, all the above is not required as announce.js has some pretty sane defaults.
in any case, these config parameters are supported:

* `storage` - which storage backend to use. options are either `mem` or `redis`. defaults to `redis`, which also happens to be the preffered backend. the local memory backend should only be used for testing.
* `redis_host` - the host used for Redis connections. defaults to `'localhost'`.
* `redis_port` - the port used for Redis connections. defaults to `6379`.
* `api_host` - the host to listen on for the internal API. this should be the same value used in your webapp to connect to announce.js. defaults to `'localhost'`.
* `api_port` - the port to listen on for the internal API. this should be the same value used in your webapp to connect to announce.js. defaults to `6600`.
* `socket_host` - the host to listen on for the external socket.IO server. defaults to `'0.0.0.0'` (so it will be available from the "outside").
* `socket_port` - the port to listen on for the external socket.IO server. this should be open in your firewall for traffic coming in from the internet. defaults to `5500`.
* `ssl_key` - path to an optional SSL key file. Add this and `ssl_certificate` if you want to server Announce.js over HTTPS.
* `ssl_certificate` - path to an SSL certificate file. the server will start in SSL mode only if both `ssl_key` and `ssl_certificate` are provided, and both are valid. else, it will start in regular, unencrypted HTTP. so pay attention.
* `sockets_volatile` - whether or not to buffer messages when sending to a client. read more about volatile mode [here](volatile "Socket.IO wiki"). defaults to `false`.


## Authorization

The announce.js authorization model works like this:

1. client A makes a request to your webapp.
2. your webapp turns to announce.js's internal API and requests a token for that user's ID.
3. upon receiving the token, the webapp sets a cookie called `announceToken` to the value of the token, and renders the requested page back to client A.
4. the requested page (containing the announce.js javascript include) uses this cookie to retrieve the token, and validates it against the announce.js server.
5. upon successful validation, a connection is established and your client will start listening on channels and events you define.

Steps 2,3,4,5 (requesting the token, setting the cookie, including the JS file, validating the token from the client)
are all handled by your platform's announce.js client.


## Usage Example (using the Django client)

* install the announce.js server as described above, and run it.
* add `announce` to `INSTALLED_APPS` in your settings.py file.
* add `'announce.middleware.AnnounceCookieMiddleware'` to your `MIDDLEWARE_CLASSES`settings. right above `SessionMiddleware`. this will take care of setting the authentication cookie.
* in your templates, add `{% load announcetags %}` at the top of the template. inside your `<head>` tag, add `{% announce_js %}`. this will include the proper `<script>` tags for you. place this tag above any js files that use the announce.js client.
* the following optional settings are availabe:
    * `ANNOUNCE_CLIENT_ADDR` - defaults to `'localhost:5500'`. *should probably be changed for production.*
    * `ANNOUNCE_API_ADDR` - defaults to `'localhost:6600'`.
    * `ANNOUNCE_HTTPS` - defaults to `False`. HTTPS is not yet implemented.

Now, from a view, emit a message to a user:

```python
from announce import AnnounceClient
announce_client = AnnounceClient()

# This is our pseudo view code
def comment_on_blog(request):
    post = Post.objects.get(...)
    # Process stuff, handle forms, do whatever you want.
    announce_client.emit(
        post.author.pk,
        'notifications',
        data={ 'msg' : 'You have a new comment!' }
    )
    # Some other things happening here..
    return render_to_response('blog_post.html', ctx)
```

In your HTML code, add the following JS snippet, to receive this notification on the client's side:

```js
// use .on() to add a listener. you can add as many listeners as you want.
announce.on('notifications', function(data){
    alert(data.msg);
});

// .init() will authenticate against the announce.js server, and open the WebSocket connection.
announce.init();
```

Your client should receive an alert with the notification. the channel name (`notifications`) and the data you send
are completley up to you, so be creative and use it wisely.

If you have more than one channel we want to listen on, we can also chain these calls:

```js
announce.on('notifications', function(data){
    popupNotification(data.msg);

}).on('alerts', function(data)}{
    alert(data.alert_msg);

}).on('something-else', function(data){
    $('#someDiv').html(data.htmlContent);
    
}).init();
```

## TODO

Well, announce.js is still brand new, and there are many ways to improve it.
Here are some ideas that come to mind:

* documentation. this README might be enough to get started, but we need good API reference, a getting started tutorial,
 and real world examples.
* MOAR CLIENTS! support more languages and frameworks: RoR, PHP, etc.
* Maybe rethink the authorization model. Need to better understand the security behind the cookie based token mechanism.
* Add support for full duplex? i.e. client could also send events to the server. not sure about this one yet.
* probably many other things to come.
