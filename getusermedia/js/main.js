navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var constraints = {audio: false, video: true};
var video = document.querySelector("video");
var result= document.querySelector("#result");

function successCallback(stream) {
  window.stream = stream; // stream available to console
  if (window.URL) {
    video.src = window.URL.createObjectURL(stream);
  } else {
    video.src = stream;
  }
  video.play();
  result.innerHTML=" - OK";
}

function errorCallback(error){
  console.log("navigator.getUserMedia error: ", error);
  result.innerHTML=" - ERROR! ("+error+")";
}

navigator.getUserMedia(constraints, successCallback, errorCallback);

