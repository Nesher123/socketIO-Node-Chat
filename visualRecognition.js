var VisualRecognitionV3 = require("watson-developer-cloud/visual-recognition/v3");
// let app = require("express")(),
//   http = require("http").Server(app),
//   io = require("socket.io")(http),
//   helmet = require("helmet"),
//   APP_PORT = process.env.PORT || 3000,
//   mongoose = require("mongoose");

//   app.use(express.static('/'));

var fs = require("fs");
function detectFacesInPicture(params) {
  var result = false;
  var visualRecognition = new VisualRecognitionV3({
    version: "2018-03-19",
    iam_apikey: "ykexr8u_PK2WVOI1yAxf0U3y02g-r16KjnILV9BYAaZn"
  });

  //var images_file = fs.createReadStream("./OfirNesher.jpeg");
  var images_file = fs.createReadStream("./cloudio-image.jpeg");

  // var params = {
  //   images_file: images_file
  // };

  visualRecognition.detectFaces(params, function(err, response) {
    if (err) {
      console.log(err);
    } else {
      console.log(JSON.stringify(response, null, 2));
      let result = response.images[0].faces[0];
      console.log("result: " + JSON.stringify(result));
      if (result == undefined) {
        console.log("no face detected");
      } else {
        console.log("face detected");
        result = true;
      }
    }
  });

  return result;
}
