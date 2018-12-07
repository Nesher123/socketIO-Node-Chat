/******
 *Cloudio
 *Developped by:
 *	Ofir Nesher - ID 310307
 *	Chen Arnon - ID 310310
 */
let app = require("express")(),
  http = require("http").Server(app),
  io = require("socket.io")(http),
  //helmet = require("helmet"),
  APP_PORT = process.env.PORT || 3000,
  mongoose = require("mongoose"),
  users = []; // stores a list of online users

// var ss = require("socket.io-stream");
// var VisualRecognitionV3 = require("watson-developer-cloud/visual-recognition/v3");
// var fs = require("fs");
// var visualRecognition = new VisualRecognitionV3({
//   version: "2018-03-19",
//   iam_apikey: "ykexr8u_PK2WVOI1yAxf0U3y02g-r16KjnILV9BYAaZn"
// });

//app.use(helmet());
app.use(express.static('res'));

// First command to run. Loads the login.html file
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/login.html");
});

// When login redirects to 'chat', the server loads chat.html
app.get("/chat", function(req, res) {
  res.sendFile(__dirname + "/chat.html");
});

/************** MongoDB - start ***************/
mongoose.connect(
  "mongodb://cloud:password1@ds115874.mlab.com:15874/chat", // "mongodb://localhost/chat"
  { useNewUrlParser: true },
  err => {
    if (err) {
      console.log(err);
      return;
    } else {
      console.log("Conntected to Mongo database!");
      // Port to listen on
      http.listen(APP_PORT, function() {
        console.log(`listening on *:${APP_PORT}`);
      });
    }
  }
);

let chatSchema = mongoose.Schema(
  {
    name: String,
    password: String
  },
  { collection: "users" }
);

let Chat = mongoose.model("USER", chatSchema);
/************** MongoDB - end ***************/

/**
 * Request handler
 */
io.on("connection", function(socket) {
  var addedUser = false;

  socket.on("login", loginMessage);
  socket.on("chat message", chatMessage);
  socket.on("sendFile", sendFile);

  //handling disconnects
  // socket.on("disconnect", function() {
  //   if (addedUser) {
  //     addedUser = false;
  //     console.log(`addedUser: ${addedUser}`);
  //     removeUserFromOnlineList(findUser(username));
  //     // users.splice(users.indexOf(socket),1);
  //     // let msg = `${socket.name} left the chat`;
  //     // console.log(msg);
  //     // io.sockets.emit("chat message", msg, "undefined");
  //   }
  // });
  socket.on("logout", function(username) {
    removeUserFromOnlineList(findUser(username));
  });
});

/**************************************
 *				Helper functions  				  *
 **************************************/
let findUser = username => {
  for (let i = 0; i < users.length; i++) {
    if (users[i].name == username) {
      return users[i];
    }
  }
};

let sendFile = function(user, base64) {
  let time = getTime();
  let msg = `(${time}) ${user.name}: `;
  let type = "";

  if (base64.includes("image")) {
    type = "img";
    // io.emit("img", msg, base64);
  } else if (base64.includes("audio")) {
    type = "audio";
    // io.emit("audio", msg, base64);
  } else if (base64.includes("video")) {
    type = "video";
    // io.emit("vid", msg, base64);
  } else if (base64.includes("pdf")) {
    type = "pdf";
    // io.emit("pdf", msg, base64);
  }

  if (type != "") {
    io.emit("sendFile", msg, base64, type);
  }
};

let loginMessage = user => {
  isUserExists(user);
};

let isUserExists = user => {
  Chat.findOne({ name: user.name }, function(err, results) {
    if (err) {
      throw err;
    } else if (results) {
      console.log("this user exists already, so checking passwords...");
      passwordsMatch(user);
    } else {
      console.log("new user registered");
      let newUser = new Chat(user);

      newUser.save(function(err) {
        if (err) throw err;
        addedUser = true;
        users.push(user);
        let msg = `${user.name} joined the chat`;
        console.log(msg);
        io.emit("loginSuccessful", msg);
      });
    }
  });
};

let passwordsMatch = user => {
  console.log("passwordsMatch");
  let msg = `Incorrect password for "${user.name}"`;
  let destination = "/";

  Chat.findOne({ name: user.name }, function(err, results) {
    if (err) {
      throw err;
    } else if (results) {
      if (results.password === user.password) {
        if (isUserOnline(user)) {
          msg = `"${user.name}" is already online`;
          io.to(`${user.id}`).emit("loginUnsuccessful", msg, destination);
        } else {
          addedUser = true;
          users.push(user);
          msg = `${user.name} joined the chat`;
          console.log(msg);
          io.emit("loginSuccessful", msg);
        }
      } else {
        console.log(`Incorrect password for "${user.name}"`);
        io.to(`${user.id}`).emit("loginUnsuccessful", msg, destination);
      }
    } else {
      console.log(msg);
      io.emit("loginUnsuccessful", msg);
    }
  });
};

let isUserOnline = user => {
  for (let i = 0; i < users.length; i++) {
    if (users[i].name == user.name) {
      let msg = `"${user.name}" is already online`;
      console.log(msg);
      return true;
    }
  }

  return false;
};

// When a user logs out (by closing the window for example), a message is emitted to chat
// Remove user JSON object from array, according to a given socket id
let removeUserFromOnlineList = user => {
  for (let i = 0; i < users.length; i++) {
    if (users[i].name == user.name) {
      users.splice(i, 1);
      break;
    }
  }

  let msg = `${user.name} left the chat`;
  console.log(msg);
  io.sockets.emit("chat message", msg, "undefined");
};

/**
 *	When a user sends a message:
 *		First, we need to extract the first word and check if it's a special command.
 *	  If it's "\l", we send a the list of all online users (only for sender).
 *	  If it's "\p", we send a private message between to the user specified in the second word.
 *		Otherwise, the message is visible to all users.
 */
let chatMessage = (sender, msg) => {
  let recipient;
  let splitString = msg.split(" ");
  let firstWord = splitString[0];
  let time = getTime();

  switch (firstWord) {
    case "\\l":
      listUsers(sender);
      break;

    case "\\p":
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
          console.log(`Recipient '${secondWord}' was not found`);
          break; // do nothing
        }
      }

      let n = msg.indexOf(recipient.name);
      msg = msg.substring(n + recipient.name.length + 1);

      io.to(`${sender.id}`)
        .to(`${recipient.id}`)
        .emit(
          "chat message",
          `(${time}) PRIVATE from ${sender.name} to ${recipient.name}: ${msg}`,
          sender.data
        );

      break;

    default:
      // send a public message
      let userMessage = getUserMessage(sender, msg, time);
      io.emit("chat message", userMessage, sender.data);
      break;
  }

  return;
};

/**
 * A user can request a list of all online users using the "\l" command
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
  io.to(`${sender.id}`).emit("chat message", onlineUsers, sender.data);
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
