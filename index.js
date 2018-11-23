/******
 *Cloudio
 *Developped by:
 *	Ofir Nesher - ID 310307
 *	Chen Arnon - ID 310310
 */
let app = require("express")();
let http = require("http").Server(app);
let io = require("socket.io")(http);
let fs = require("fs");
let APP_PORT = process.env.PORT || 3000;

// Array to store the list of users along with their respective socket id
let users = [];

// First command to run. Loads the login.html file
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/login.html");
});

// When login redirects to 'chat', the server loads chat.html
app.get("/chat", function(req, res) {
  res.sendFile(__dirname + "/chat.html");
});

// Port to listen on
http.listen(APP_PORT, function() {
  console.log(`listening on *:${APP_PORT}`);
});

/**
 * Request handler
 */
io.on("connection", function(socket) {
  //socket.on("removeUserFromList", removeUser);
  socket.on("chat message", chatMessage);
  socket.on("login", loginMessage);
  //handling disconnects
  socket.on("disconnect", function() {
    let userToRemove = findUser(socket.id);
    removeUser(userToRemove);
    let msg = `${userToRemove.name} left the chat`;
    io.sockets.emit("removeUserFromList", msg);
  });
});

/******************************************************
 *					Helper functions				  *
 *******************************************************/
let findUser = id => {
  for (let i = 0; i < users.length; i++) {
    if ((users[i].id = id)) {
      return users[i];
    }
  }
};

let loginMessage = user => {
  let userFound = isUserExists(user);

  if (!userFound) {
    users.push(user);
    // console.log(`user.id: ${user.id}`);

    let newUserMessage = `${user.name} joined the chat`;
    io.emit("loginSuccessful", newUserMessage);
  } else {
    let destination = "/";
    let msg = `The username "${user.name}" already exists`;
    io.to(user.id).emit("loginUnsuccessful", destination, msg);
  }
};

let isUserExists = user => {
  for (let i = 0; i < users.length; i++) {
    if (users[i].name == user.name) {
      // console.log("username exists");
      return true;
    }
  }

  // console.log("username doesn't exist");
  return false;
};

// When a user logs out (by closing the window for example), a message is emitted to chat
// Remove user JSON object from array, according to a given socket id
let removeUser = user => {
  for (i = 0; i < users.length; i++) {
    if (users[i].name == user.name) {
      // console.log("Removing " + user.name);
      users.splice(i, 1);
      break;
    }
  }

  let msg = `${user.name} left the chat`;
  io.emit("chat message", msg);
};

/**
 *	When a user sends a message:
 *		First, we need to extract the first word and check if it's a special command.
 *	  If it's "\list", we send a the list of all online users (only for sender).
 *	  If it's "\private", we send a private message between to the user specified in the second word.
 *		Otherwise, the message is visible to all users.
 */
let chatMessage = (sender, msg) => {
  let recipient;
  let splitString = msg.split(" ");
  let firstWord = splitString[0];
  let time = getTime();

  switch (firstWord) {
    case "\\list":
      listUsers(sender);
      break;

    case "\\private":
      let secondWord = splitString[1];

      if (secondWord == sender.name) {
        recipient = sender;
      } else {
        for (i = 0; i < users.length; i++) {
          if (users[i].name == secondWord) {
            recipient = users[i];
            break;
          }
        }

        if (recipient == undefined) {
          // if here then no recipient found
          console.log(`Recipient ${secondWord} was not found`);
          break; // do nothing
        }
      }

      let n = msg.indexOf(recipient.name);
      msg = msg.substring(n + recipient.name.length + 1);

      io.to(`${sender.id}`)
        .to(`${recipient.id}`)
        .emit(
          "chat message",
          `(${time}) PRIVATE from ${sender.name} to ${recipient.name}: ${msg}`
        );

      break;

    default:
      // send a public message
      let userMessage = getUserMessage(sender, msg, time);
      io.emit("chat message", userMessage);
      break;
  }

  return;
};

/**
 * A user can request a list of all online users using the "\list" command
 * That list is only visible to sender.
 */
let listUsers = sender => {
  let onlineUsers = "List of online users: ";
  for (i = 0; i < users.length; i++) {
    if (i < users.length - 1) {
      onlineUsers += users[i].name + ", ";
    } else {
      onlineUsers += users[i].name;
    }
  }

  // send the list to the specific socket that typed it, according to its socketID
  io.to(sender.id).emit("chat message", onlineUsers);
};

// Concatenate message together with a timestamp and the username who has posted the message
let getUserMessage = (user, msg, time) => {
  return `(${time}) ${user.name}: ${msg}`;
};

// Returns a string with the current time
let getTime = () => {
  let date = new Date();
  let hour = date.getHours();
  //hour = (hour < 10 ? "0" : "") + hour;

  let min = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;

  let time = hour + ":" + min;

  return time;
};
