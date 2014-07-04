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

watchPeerConnectionStats(window, "localPeerConnection", "localStats");
watchPeerConnectionStats(window, "remotePeerConnection", "remoteStats");

function watchPeerConnectionStats(aParentObj, aPropPeerConnection, aStatOutputId)
{
  if(! aParentObj instanceof Object) return;

  var elemOutput = document.getElementById(aStatOutputId);
  if(!elemOutput) console.error("Nowhere to output stats");

  aParentObj.watch(aPropPeerConnection,
    (prop, oldval, newval)=>{
      if(newval instanceof mozRTCPeerConnection) {
        newval.name = prop;
        newval.statReporter = new RTCStatReporter(newval, elemOutput, 1000);
        newval.statReporter.start();
      } else if(oldval instanceof mozRTCPeerConnection) {
        oldval.statReporter.stop();
      }
      return newval;
    }
  );
}

function RTCStatReporter(aPeerConnection, aElemOutput, aInterval) {
  if(!aPeerConnection)
    throw new TypeError("aPeerConnection is empty. --> "
        + aPeerConnection);
  if(aInterval <= 0)
    throw new RangeError("aInterval shoud be positive integer. --> "
        + aInterval);
  if(!aElemOutput)
    throw new TypeError("Element to output RTCStat is empty --> "
        + aElemOutput);

  // Report interval in msec
  this.mPeerConnection = aPeerConnection;
  this.mInterval = aInterval;
  this.mElemOutput = aElemOutput;
}
RTCStatReporter.prototype = {
  start: function() {
    this.mTimerId = window.setInterval(this.report.bind(this), this.mInterval);
  },
  stop: function() {
    window.clearInterval(this.mTimerId);
  },
  report: function() {
    var prefix=this.mElemOutput.id=='localStats'?"local":"remote";
    var peerconnection = this.mPeerConnection;
    peerconnection.getStats(null,
      (aStatReports)=>{
        var reportTable=[
            '<table>',
            '<tr><td colspan="2" class="subject">'+this.mPeerConnection.name+'</td></tr>',
          ];
        aStatReports.forEach((stat)=>{
          // http://dxr.mozilla.org/mozilla-central/search?q=%22enum+RTCStatsType%22&case=true
          switch(stat.type) {
            case "inboundrtp":
              // dictionary RTCInboundRTPStreamStats : RTCRTPStreamStats
              //  http://dxr.mozilla.org/mozilla-central/search?q=%22dictionary+RTCInboundRTPStreamStats%22&case=true
              reportTable.push(
                  '<tr><td colspan="2" class="subject">'+stat.type+'</td></tr>',
                  '<tr><td>Bytes Received</td><td>'+stat.bytesReceived+'</td></tr>',
                  '<tr><td>Packets Received</td><td>'+stat.packetsReceived+'</td></tr>',
                  '<tr><td>Packet Loss</td><td>'+stat.packetsLost+'</td></tr>',
                '');
              break;
            case "outboundrtp":
              // dictionary RTCOutboundRTPStreamStats : RTCRTPStreamStats
              // http://dxr.mozilla.org/mozilla-central/search?q=%22dictionary+RTCOutboundRTPStreamStats%22&case=true&redirect=true
              reportTable.push(
                  '<tr><td colspan="2" class="subject">'+stat.type+'</td></tr>',
                  '<tr><td>Bytes Sent</td><td>'+stat.bytesSent+'</td></td></tr>',
                  '<tr><td>Packets Sent</td><td>'+stat.packetsSent+'</td></td></tr>',
                '');
              break;
            case "session":
              reportTable.push(
                  '<tr><td colspan="2" class="subject">'+stat.type+'</td></tr>',
                  '<tr><td colspan="2"> WORKS FOR ME</td></tr>',
                '');
              break;
            case "track":
              // dictionary RTCMediaStreamTrackStats : RTCStats
              // http://dxr.mozilla.org/mozilla-central/search?q=%22dictionary+RTCMediaStreamTrackStats%22&case=true&redirect=true
              reportTable.push(
                  '<tr><td colspan="2" class="subject">'+stat.type+'</td></tr>',
                  '<tr><td colspan="2"> WORKS FOR ME</td></tr>',
                '');
              break;
            case "transport":
              // dictionary RTCTransportStats: RTCStats
              // http://dxr.mozilla.org/mozilla-central/search?q=%22dictionary+RTCTransportStats%3A+RTCStats+{%22&case=true
              reportTable.push(
                  '<tr><td colspan="2" class="subject">'+stat.type+'</td></tr>',
                  '<tr><td colspan="2"> WORKS FOR ME</td></tr>',
                '');
              break;
            case "candidatepair":
              // dictionary RTCIceCandidatePairStats : RTCStats
              // http://dxr.mozilla.org/mozilla-central/search?q=%22dictionary+RTCIceCandidatePairStats+%3A+RTCStats%22&case=true&redirect=true
              reportTable.push(
                  '<tr><td colspan="2" class="subject">'+stat.type+'</td></tr>',
                  '<tr><td colspan="2"> WORKS FOR ME</td></tr>',
                '');
              break;
            case "localcandidate":
            case "remotecandidate":
              // dictionary RTCIceCandidateStats : RTCStats
              // http://dxr.mozilla.org/mozilla-central/search?q=%22dictionary+RTCIceCandidateStats+%3A+RTCStats%22&case=true&redirect=true
              reportTable.push(
                  '<tr><td colspan="2" class="subject">'+stat.type+'</td></tr>',
                  '<tr><td>'+stat.candidateType+'</td><td>'+stat.transport+':'+stat.ipAddress+'/'+stat.portNumber+'</td></tr>',
                '');
              break;
            default :
              console.warning("Unknown stat type : " + stat.type);
              console.log(stat);
              break;
          }
        });
        reportTable.push('</table>');
        this.mElemOutput.innerHTML = reportTable.join('\n');
      },
      errCallback("RTCStatReporter"));
  },
}
