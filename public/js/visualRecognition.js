let VisualRecognitionV3 = require("watson-developer-cloud/visual-recognition/v3");

let visualRecognition = new VisualRecognitionV3({
  version: "2018-03-19",
  iam_apikey: "ykexr8u_PK2WVOI1yAxf0U3y02g-r16KjnILV9BYAaZn"
});

var params = {
  images_file: images_file
};

visualRecognition.detectFaces(params, function(err, response) {
  if (err) {
    console.log(err);
    // console.log('asdasdasdasdasdasdsa');
  } else {
    console.log(JSON.stringify(response, null, 2));
    if (response.images[0].faces.length <= 0) {
      console.log("no face detected");
      result = false;
    } else {
      console.log("face detected");
      result = true;
    }
  }
});
