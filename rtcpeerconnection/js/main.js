"use strict"

var localStream, localPeerConnection, remotePeerConnection;

var localVideo   = document.getElementById("localVideo")
  , remoteVideo  = document.getElementById("remoteVideo")
  , startButton  = document.getElementById("startButton")
  , callButton   = document.getElementById("callButton")
  , hangupButton = document.getElementById("hangupButton")
  , result       = document.getElementById("result")
  ;

startButton.disabled = false;
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

var RTCPeerConnection = (window.mozRTCPeerConnection || window.webkitRTCPeerConnection);
if ( ! RTCIceCandidate )
  var RTCIceCandidate = window.mozRTCIceCandidate;

var total = '';
function trace(text) {
  total += text;
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
  result.innerHTML=" - ("+text+")";
}

function errCallback(prefix) {
  return function (error) {
    trace("[" + prefix + "] Error : " + error.name + " --> " + error.message);
  };
}

function gotStream(stream){
  trace("Received local stream");
  localVideo.src = URL.createObjectURL(stream);
  localStream = stream;
  callButton.disabled = false;

  indicateLocalFPS("localVideo", "localFPS");
}

function start() {
  trace("Requesting local stream");
  startButton.disabled = true;
  navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  navigator.getUserMedia({video:true}, gotStream,
      errCallback("navigator.getUserMedia"));
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  trace("Starting call");

  if (localStream.getVideoTracks().length > 0) {
    trace('Using video device: ' + localStream.getVideoTracks()[0].label);
  }
  if (localStream.getAudioTracks().length > 0) {
    trace('Using audio device: ' + localStream.getAudioTracks()[0].label);
  }

  var servers = null;

  localPeerConnection = new RTCPeerConnection(servers);
  trace("Created local peer connection object localPeerConnection");
  localPeerConnection.onicecandidate = gotLocalIceCandidate;

  remotePeerConnection = new RTCPeerConnection(servers);
  trace("Created remote peer connection object remotePeerConnection");
  remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
  remotePeerConnection.onaddstream = gotRemoteStream;

  localPeerConnection.addStream(localStream);
  trace("Added localStream to localPeerConnection");
  localPeerConnection.createOffer(gotLocalDescription,
      errCallback("localPeerConnection.createOffer"));
}

function gotLocalDescription(description){
  localPeerConnection.setLocalDescription(description);
  trace("Offer from localPeerConnection: \n" + description.sdp);
  remotePeerConnection.setRemoteDescription(description, function(){
      remotePeerConnection.createAnswer(gotRemoteDescription,
          errCallback("remotePeerConnection.createAnswer"))
    }, errCallback("remotePeerConnection.setRemoteDescription"));
}

function gotRemoteDescription(description){
  remotePeerConnection.setLocalDescription(description);
  trace("Answer from remotePeerConnection: \n" + description.sdp);
  localPeerConnection.setRemoteDescription(description, function(){
      indicateRemoteFPS("remoteVideo", "remoteFPS");
    }, errCallback("localPeerConnection.setRemoteDescription"));
}

function hangup() {
  trace("Ending call");
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}

function gotRemoteStream(event){
  remoteVideo.src = URL.createObjectURL(event.stream);
  trace("Received remote stream");
}

function gotLocalIceCandidate(event){
  if (event.candidate) {
    remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    trace("Local ICE candidate: \n" + event.candidate.candidate);
  }
}

function gotRemoteIceCandidate(event){
  if (event.candidate) {
    localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    trace("Remote ICE candidate: \n " + event.candidate.candidate);
  }
}

function indicateLocalFPS(aVideoId, aSpanId)
{
  var videoElem = document.getElementById(aVideoId);
  var spanElem = document.getElementById(aSpanId);
  var lastFrame = 0;

  updateFPS();
  function updateFPS() {
    var fps = 0;
    if ( lastFrame ) fps = videoElem.mozPaintedFrames - lastFrame;
    lastFrame = videoElem.mozPaintedFrames || 0;
    spanElem.innerHTML = fps;
    window.setTimeout(updateFPS, 1000);
  }
}

function indicateRemoteFPS(aVideoId, aSpanId)
{
  var videoElem = document.getElementById(aVideoId);
  var spanElem = document.getElementById(aSpanId);
  var lastFrame = 0;

  updateFPS();
  function updateFPS() {
    var fps = 0;
    if ( lastFrame ) fps = videoElem.mozPaintedFrames - lastFrame;
    lastFrame = videoElem.mozPaintedFrames || 0;
    spanElem.innerHTML = fps;
    window.setTimeout(updateFPS, 1000);
  }
}
