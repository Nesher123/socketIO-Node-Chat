/******
*
*Cloudio 1.0
*
*Developped by:
*	Chen Arnon - ID 310310
*	Ofir Nesher - ID 310307
*/
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
// let dl = require('delivery');
let fs = require('fs');
const APP_PORT = process.env.PORT || 3000;

// Array to store the list of users along with their respective socket id
let users = [];

// First command to run. Loads the login.html file
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/login.html');
});

// When login redirects to 'chat', the server loads chat.html 
app.get('/chat', function(req, res) {
	res.sendFile(__dirname + '/chat.html');
});

// Port to listen on
http.listen(APP_PORT, function() {
	console.log(`listening on *:${APP_PORT}`);
});

io.on('connection', function(socket) {
	socket.on('removeUserFromList', removeUser);
	socket.on('userLogout', userLogout);
	socket.on('chat message', chatMessage);
	socket.on('login', loginMessage);
	socket.on('list', listUsers);
	socket.on('base64 file', function (file) {
		console.log('received base64 file from' + msg.username);
		socket.username = msg.username;
    // socket.broadcast.emit('base64 image', //exclude sender
    io.sockets.emit('base64 file',  //include sender

    {
    	username: socket.username,
    	file: msg.file,
    	fileName: msg.fileName
    }

    );
});
});


/******************************************************
*					Helper functions				  *
*******************************************************/

// When a user logout (by closing the tab for example), the userDisconnected is emitted on the chat.html file
let userLogout = (userName) => {
	io.emit('userDisconnected', userName);
}

/**
*	When a user sends a message:
*		First, we need to extract the first word and check if starts with a "\" and a name of someone who's logged in.
*		Then, if yes, we send a private message between the two.
*		Otherwise, the message is visible to all users.
*/
let chatMessage = (userName, msg, time) => {
	let firstWord = msg.replace(/ .*/,'');
	let firstWordWithoutFirstChar = firstWord.substr(1);
	let msgWithoutFirstWord = msg.substr(msg.indexOf(' ') + 1);
	let sender;

	if (firstWord.charAt(0) == '\\') {
		// Find sender index in array
		for (i = 0; i < users.length; i++) {
			if (users[i].userName == userName) {
				sender = i;
			}
		}

		for (i = 0; i < users.length; i++) {
			// check if message first words is "\someusername" (backslash \)
			if ('\\' + users[i].userName == firstWord) {
				// Prints the message to the recipient and sender windows only, according to their relative id and index in the users array
				io.to(`${users[i].id}`).emit('chat message', '(' + time.toString() + ') ' + 'PRIVATE to ' + firstWordWithoutFirstChar + ' from ' + users[sender].userName + ': ' + msgWithoutFirstWord);
				io.to(`${users[sender].id}`).emit('chat message', '(' + time.toString() + ') ' + 'PRIVATE from ' + users[sender].userName + ' to ' + firstWordWithoutFirstChar + ': ' + msgWithoutFirstWord);

				return;	
			}
		}
	}

	// send a public message if first word of message is not "\someUserName"
	let userMessage = getUserMessage(userName, msg, time);
	io.emit('chat message', userMessage);
}

/**
 * On login, save user's id and username as a JSON object inside the users array
 * and emit this event to the chat.html for a message to be displayed inside the chat window
 */
 let loginMessage = (user, socketID) => {
 	let userIsConnected = user + ' joined the chat';
 	console.log(userIsConnected);
 	users.push({
 		id : socketID,
 		userName : user
 	});

 	io.emit('login', userIsConnected);
 }

/**
 * A user can request a list of all online users using the "\list" command
 * That list is only sent to the requestor.
 */
 let listUsers = (socketID) => {
 	let onlineUsers = 'List of online users: ';
 	for (i = 0; i < users.length; i++){
 		if (i < users.length - 1){
 			onlineUsers += users[i].userName + ', ';
 		}
 		else {
 			onlineUsers += users[i].userName;
 		}
 	}

	// send the list to the specific socket that typed it, according to its socketID
	io.to(`${socketID}`).emit('getList', onlineUsers);
}

// concatenate message together with a timestamp and the username who has posted the message
let getUserMessage = (userName, msg, time) => {
	return '(' + time.toString() + ') ' + userName + ': ' + msg;
}

// Remove user JSON object from array, according to a given socket id
let removeUser = (userID) => {
	for(i = 0; i < users.length; i++) {
		if(users[i].id == userID) {
			users.splice(i, 1);
			return;
		}
	}
}
