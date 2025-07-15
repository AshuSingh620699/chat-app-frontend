let callAlreadyEnded = false;
let localStream;
let peerConnection;
let unansweredTimeout;
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }, // Public STUN server
  ]
};

// Handle receiving voice offer and send back answer
socket.on('voice-offer', async ({ from, offer }) => {
  peerConnection = new RTCPeerConnection(config);

  // Handle ICE candidates
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('voice-candidate', {
        to: from,
        from: localStorage.getItem("userId"),
        candidate: event.candidate
      });
    }
  };

  peerConnection.ontrack = (event) => {
    const remoteAudio = document.getElementById("remoteAudio");
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.autoplay = true;
    remoteAudio.muted = false;
    remoteAudio.play().catch(err => console.warn("Autoplay failed:", err));
  };

  // Get your mic and add tracks
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  } catch (err) {
    console.error("Microphone error:", err);
    return;
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit('voice-answer', {
    to: from,
    from: localStorage.getItem("userId"),
    answer
  });
});

// Handle receiving voice answer
socket.on('voice-answer', async ({ from, answer }) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Handle receiving ICE candidates
socket.on('voice-candidate', async ({ from, candidate }) => {
  if (peerConnection) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("Error adding ICE candidate:", err);
    }
  }
});


function startCall(friendId, friendName, friendImage) {
  callAlreadyEnded = false;
  const to = friendId; // Assuming friend._id is the ID of the friend you're calling
  const from = localStorage.getItem("userId");


  // Populate calling modal
  document.getElementById("callingAvatar").src = friendImage || defaultImage;
  document.getElementById("callingUsername").innerText = `Calling ${friendName}...`;
  document.getElementById("callingModal").classList.remove("hidden");
  document.getElementById("callingModal").style.display = "flex"; // Ensure it's visible
  document.getElementById("callingModal").classList.remove("hidden");

  // Play outgoing ringtone
  playRingtone("outgoing");
  // Emit start call event
  socket.emit("start-call", {
    to,
    from,
    callType: "voice",
  });

  // Set a timeout to handle unanswered calls
  unansweredTimeout = setTimeout(() => {
    stopRingtone("outgoing");
    callAlreadyEnded = true;

    // Hide both modals just in case
    document.getElementById("callingModal")?.classList.add("hidden");
    document.getElementById("incomingCallPopup")?.classList.add("hidden"); // 👈 might still be visible on receiver

    // Show "No Answer" modal
    document.getElementById("noAnswerModal").classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("noAnswerModal").classList.add("hidden");
    }, 3000);

    socket.emit("end-call", { to, from, callType: "voice" }); // 👈 emit this
  }, 45000); // 45 seconds timeout

  // Handle end call button
  document.getElementById("endCallBtn").onclick = () => {
    clearTimeout(unansweredTimeout)
    stopRingtone("outgoing"); // Stop outgoing ringtone
    callAlreadyEnded = true; // Set flag to prevent further actions
    socket.emit("end-call", { to, from, callType: "voice" });
    document.getElementById("callingModal").classList.add("hidden");
  };
}


// Receiving incoming call
socket.on("incoming-call", ({ to, from, callType, username, profileImage }) => {
  showIncomingCallPopup(to, from, callType, username, profileImage);
});

function showIncomingCallPopup(to, from, callType, username, profileImage) {
  playRingtone("incoming"); // Play incoming ringtone
  document.getElementById("incomingCallPopup").classList.remove("hidden");
  document.getElementById("incomingcallingAvatar").src = profileImage || defaultImage;
  document.getElementById("callerName").innerText = `Incoming ${callType} call from ${username}`;


  document.getElementById("acceptCallBtn").onclick = () => {
    clearTimeout(unansweredTimeout); // Clear unanswered timeout
    if (callAlreadyEnded) return; // Prevent multiple calls to accept

    callAlreadyEnded = false;
    document.getElementById("callingModal").classList.add("hidden");
    document.getElementById("incomingCallPopup").classList.add("hidden");
    socket.emit("accept-call", { to: from, from: localStorage.getItem("userId"), callType });

    showOngoingCallModal(from, username, profileImage); // Show ongoing call modal
  };

  document.getElementById("rejectCallBtn").onclick = () => {
    stopRingtone("incoming"); // Stop incoming ringtone
    clearTimeout(unansweredTimeout); // Clear unanswered timeout
    if (callAlreadyEnded) return; // Prevent multiple calls to reject
    callAlreadyEnded = true; // Set flag to prevent further actions
    document.getElementById("incomingCallPopup").classList.add("hidden");
    socket.emit("reject-call", { to: from, from: localStorage.getItem("userId"), callType });
    document.getElementById("incomingCallPopup").classList.add("hidden");
  };
}

socket.on("call-accepted", ({ from, callType, username, profileImage }) => {
  clearTimeout(unansweredTimeout)
  document.getElementById("incomingCallPopup").classList.add("hidden");
  document.getElementById("callingModal").classList.add("hidden");
  document.getElementById("ongoingCallModal").classList.remove("hidden");
  stopRingtone("outgoing"); // Stop incoming ringtone

  showOngoingCallModal(from, username, profileImage); // Show ongoing call modal
  startVoiceCall(from); // Start the actual WebRTC connection
});

socket.on("call-rejected", ({ from, callType }) => {
  setTimeout(unansweredTimeout)
  document.getElementById("callingModal").classList.add("hidden");
  stopRingtone("outgoing"); // Stop outgoing ringtone
  stopRingtone("incoming"); // Stop incoming ringtone

  document.getElementById("callingModal").classList.add("hidden");
  document.getElementById("incomingCallPopup").classList.add("hidden");
  document.getElementById("callRejectedModal").classList.remove('hidden')
  setTimeout(() => {
    document.getElementById("callRejectedModal").classList.add('hidden')
  }, 3000);
});


async function startVoiceCall(remoteUserId, isReceiver = false) {
  peerConnection = new RTCPeerConnection(config);

  // Handle ICE candidates
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('voice-candidate', {
        to: remoteUserId,
        from: localStorage.getItem("userId"),
        candidate: event.candidate
      });
    }
  };

  // For now we can just log stream connection success
  peerConnection.ontrack = (event) => {
    const remoteAudio = document.getElementById("remoteAudio");
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.autoplay = true;
    remoteAudio.muted = false; // Ensure remote audio is not muted
    remoteAudio.play().catch(err => console.warn("Autoplay failed:", err));

  };

  // Get mic access
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  } catch (err) {
    console.error("Microphone access denied:", err);
    alert("Microphone access is required to make calls.");
    return;
  }

  // If you're the caller (not receiver), create and send offer
  if (!isReceiver) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('voice-offer', {
      to: remoteUserId,
      from: localStorage.getItem("userId"),
      offer
    });
  }
}


function endVoiceCall(to) {
  if (callAlreadyEnded) return; // Prevent multiple calls to end
  callAlreadyEnded = true; // Set flag to prevent further actions
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  // Inform the other user
  socket.emit('end-call', {
    to,
    from: localStorage.getItem("userId"),
    callType: 'voice'
  });

  // Hide modals if visible
  document.getElementById("callingModal")?.classList.add("hidden");
  document.getElementById("incomingCallPopup")?.classList.add("hidden");
  document.getElementById("ongoingCallModal")?.classList.add("hidden");
}

socket.on('call-ended', ({ from }) => {
  clearTimeout(unansweredTimeout);
  stopRingtone("incoming");
  stopRingtone("outgoing");
  if (callAlreadyEnded) return; // Prevent multiple calls to end
  document.getElementById("callingModal").classList.add("hidden");
  document.getElementById("incomingCallPopup").classList.add("hidden");
  document.getElementById("ongoingCallModal").classList.add("hidden");

  document.getElementById("callEndedModal").classList.remove('hidden');
  setTimeout(() => {
    document.getElementById("callEndedModal").classList.add('hidden');
  }, 3000);
  callAlreadyEnded = true; // Set flag to prevent further actions
  // Reset ongoing call state
  endVoiceCall(from);
  hideOngoingCallModal();
});

// Ongoing Call Modal
let callStartTime;
let timerInterval;

function showOngoingCallModal(from, friendName, friendImage) {
  document.getElementById("incomingCallPopup").classList.add("hidden");
  document.getElementById("ongoingCallModal").classList.remove("hidden");
  document.getElementById("ongoingCallAvatar").src = friendImage || defaultImage;
  document.getElementById("ongoingCallUsername").innerText = `Ongoing call with ${friendName}`;

  // Start timer
  callStartTime = Date.now();
  timerInterval = setInterval(updateCallDuration, 1000);

  stopRingtone("incoming"); // Stop incoming ringtone

  startVoiceCall(from, true); // true means we're the receiver
  // Ending the call
  document.getElementById("endCallBtnActive").onclick = () => {
    endVoiceCall(from);
    clearInterval(timerInterval);
    hideOngoingCallModal();
  }
}
function updateCallDuration() {
  const duration = Math.floor((Date.now() - callStartTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  document.getElementById("callTimer").innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
function hideOngoingCallModal() {
  document.getElementById("ongoingCallModal").classList.add("hidden");
  clearInterval(timerInterval);
  document.getElementById("callTimer").innerText = "0:00"; // Reset timer display
}

// playing ringtone sound
function playRingtone(type) {
  const outgoingSound = document.getElementById("outgoingsound");
  const incomingsound = document.getElementById("incomingsound");
  if (type === "outgoing") {
    outgoingSound.loop = true; // Loop the outgoing sound
    outgoingSound.currentTime = 0; // Reset sound to start
    outgoingSound.play().catch(err => console.warn("Autoplay failed:", err));
  }
  else if (type === "incoming") {
    incomingsound.loop = true; // Loop the incoming sound
    incomingsound.currentTime = 0; // Reset sound to start
    incomingsound.play().catch(err => console.warn("Autoplay failed:", err));
  }
}

// Stop ringtone sound
function stopRingtone(type) {
  const outgoingSound = document.getElementById("outgoingsound");
  const incomingsound = document.getElementById("incomingsound");
  if (type === "outgoing") {
    outgoingSound.pause();
    outgoingSound.currentTime = 0; // Reset sound to start
  }
  else if (type === "incoming") {
    incomingsound.pause();
    incomingsound.currentTime = 0; // Reset sound to start
  }
}