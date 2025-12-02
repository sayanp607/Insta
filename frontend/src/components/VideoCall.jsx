import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getSocket } from "@/socketInstance,";
import { Button } from "./ui/button";
import { PhoneOff, Video, VideoOff, Mic, MicOff, X } from "lucide-react";
import { useSelector } from "react-redux";
import axios from "axios";
import { API_BASE_URL } from "@/main";

const VideoCall = ({ selectedUser, onClose, incomingCallData }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerId, setCallerId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const wasCallAcceptedRef = useRef(false); // Track if call was ever accepted
  const callStartTimeRef = useRef(null); // Track call start time with ref

  const { user } = useSelector((store) => store.auth);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callAcceptedRef = useRef(false); // Track if call:accepted has been processed
  const callInitiatedRef = useRef(false); // Track if outgoing call has been initiated
  const socket = getSocket();

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
    ],
  };

  const getMediaStream = async (isOptional = false) => {
    try {
      console.log("Requesting camera and microphone access...");
      console.log("Current URL:", window.location.href);
      console.log("Protocol:", window.location.protocol);

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Your browser doesn't support camera/microphone access"
        );
      }

      // First check permissions
      try {
        const cameraPermission = await navigator.permissions.query({
          name: "camera",
        });
        const micPermission = await navigator.permissions.query({
          name: "microphone",
        });
        console.log("Camera permission:", cameraPermission.state);
        console.log("Microphone permission:", micPermission.state);
      } catch (permError) {
        console.log("Permission API not available, will request directly");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      console.log("Media stream obtained successfully");
      console.log("Video tracks:", stream.getVideoTracks().length);
      console.log("Audio tracks:", stream.getAudioTracks().length);

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);

      // If camera is in use and this is optional (receiving call), offer to continue without video
      if (
        (error.name === "NotReadableError" ||
          error.name === "TrackStartError") &&
        isOptional
      ) {
        const continueWithoutVideo = confirm(
          "❌ Camera is already in use (possibly by Firefox in another window).\n\n" +
            "This happens when testing with one camera on the same computer.\n\n" +
            "Options:\n" +
            "1. Click 'OK' to join call WITHOUT your camera/mic (you can still see and hear the caller)\n" +
            "2. Click 'Cancel' to end the call\n\n" +
            "For full video calls, use:\n" +
            "• Two different devices (laptop + phone)\n" +
            "• OR close Firefox and use two Chrome windows (normal + incognito)"
        );

        if (continueWithoutVideo) {
          console.log("Continuing without local video stream");
          // Create a dummy stream or return null - we'll handle this in the peer connection
          return null;
        } else {
          onClose();
          return null;
        }
      }

      let errorMessage = "Unable to access camera/microphone.\n\n";

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        errorMessage +=
          "❌ Permission was DENIED.\n\nPlease:\n1. Look for the camera/microphone icon (🎥 or 🔒) in your browser's address bar\n2. Click it and select 'Allow'\n3. Refresh the page (F5)\n4. Try the call again\n\nOR\n\nGo to Chrome Settings → Privacy and security → Site Settings → Camera/Microphone\nAdd " +
          window.location.origin +
          " to allowed sites";
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        errorMessage +=
          "❌ No camera or microphone found.\n\nMake sure your HP TrueVision HD Camera is connected and not disabled in Device Manager.";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        errorMessage +=
          "❌ Camera is already in use.\n\n" +
          "This happens because you're testing with Firefox AND Chrome on the same camera.\n\n" +
          "Solutions:\n" +
          "1. Close Firefox, then use Chrome (normal window) + Chrome (incognito window)\n" +
          "2. Use two different devices (laptop + phone)\n" +
          "3. Test with just one direction working at a time";
      } else if (error.name === "SecurityError") {
        errorMessage +=
          "❌ Security error.\n\nMake sure you're accessing via http://localhost:5173 (not 127.0.0.1 or IP address)";
      } else {
        errorMessage +=
          error.message || "Please check your browser settings and try again.";
      }

      alert(errorMessage);
      onClose();
      return null;
    }
  };

  const createPeerConnection = (stream, remotePeerId) => {
    console.log("Creating peer connection for:", remotePeerId);
    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks to peer connection (if stream exists)
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log("Adding track:", track.kind);
        pc.addTrack(track, stream);
      });
    } else {
      console.log("No local stream - joining as viewer only");
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(
        "Received remote track:",
        event.track.kind,
        "enabled:",
        event.track.enabled
      );
      console.log("Event streams:", event.streams);

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        console.log(
          "Setting remote stream with tracks:",
          stream.getTracks().map((t) => `${t.kind}: ${t.enabled}`)
        );

        setRemoteStream(stream);

        // Ensure video element gets the stream
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          // Force play to ensure audio/video work
          remoteVideoRef.current
            .play()
            .catch((err) => console.log("Play error:", err));
          console.log("Remote video element srcObject set and playing");
        }
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log("Sending ICE candidate to:", remotePeerId);
        socket.emit("ice:candidate", {
          to: remotePeerId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state changed:", pc.connectionState);
      if (pc.connectionState === "failed") {
        console.log("Connection failed, ending call");
        endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "closed"
      ) {
        console.log("ICE connection failed or closed");
      }
    };

    setPeerConnection(pc);
    return pc;
  };

  // Handle outgoing call when selectedUser is provided (user clicked video call button)
  useEffect(() => {
    if (
      selectedUser &&
      !incomingCallData &&
      !isCalling &&
      socket &&
      !callInitiatedRef.current
    ) {
      console.log("Starting outgoing call to:", selectedUser);
      callInitiatedRef.current = true; // Mark as initiated
      (async () => {
        setIsCalling(true);
        const stream = await getMediaStream();
        if (!stream) {
          setIsCalling(false);
          return;
        }

        const pc = createPeerConnection(stream, selectedUser._id);

        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);

          console.log("Created offer with SDP:", offer.sdp.substring(0, 200));
          console.log("Offer type:", offer.type);
          console.log(
            "Local tracks in offer:",
            pc.getSenders().map((s) => s.track?.kind)
          );

          // Get current user ID from socket query params
          const currentUserId = socket.io?.opts?.query?.userId;
          console.log(
            "Emitting call:initiate from:",
            currentUserId,
            "to:",
            selectedUser._id
          );

          socket.emit("call:initiate", {
            to: selectedUser._id,
            from: currentUserId,
            offer,
          });

          console.log("Call initiated successfully");
        } catch (error) {
          console.error("Error starting call:", error);
          setIsCalling(false);
        }
      })();
    }
  }, [selectedUser, incomingCallData, socket]);

  // Handle incoming call data passed from parent
  useEffect(() => {
    if (incomingCallData) {
      console.log("Incoming call data received:", incomingCallData);
      setIsReceivingCall(true);
      setCallerId(incomingCallData.from);
      // Auto accept the call since user clicked accept button
      (async () => {
        const stream = await getMediaStream(true); // true = optional, can continue without camera
        // Allow continuing even without stream (viewer mode)

        const pc = createPeerConnection(stream, incomingCallData.from);

        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription(incomingCallData.offer)
          );
          console.log("Remote description set from offer");
          console.log(
            "Remote tracks available:",
            pc.getReceivers().map((r) => r.track?.kind)
          );

          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(answer);

          console.log("Created answer with SDP:", answer.sdp.substring(0, 200));
          console.log("Answer type:", answer.type);
          console.log(
            "Local tracks in answer:",
            pc.getSenders().map((s) => s.track?.kind)
          );

          // Get current user ID from socket
          const currentUserId = socket.io?.opts?.query?.userId;

          socket.emit("call:accept", {
            to: incomingCallData.from,
            from: currentUserId,
            answer,
          });

          setCallAccepted(true);
          wasCallAcceptedRef.current = true; // Mark that call was accepted
          setCallStartTime(Date.now()); // Start tracking call duration
          callStartTimeRef.current = Date.now(); // Also save in ref
          setIsReceivingCall(false);

          // Process any pending ICE candidates
          pendingCandidatesRef.current.forEach(async (candidate) => {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error("Error adding queued candidate:", err);
            }
          });
          pendingCandidatesRef.current = [];
        } catch (error) {
          console.error("Error accepting call:", error);
        }
      })();
    }
  }, [incomingCallData]);

  useEffect(() => {
    if (!socket) return;

    // Don't listen for call:incoming here - that's handled by IncomingCallNotification
    // Only handle call state changes (accepted, rejected, ended)

    const handleCallAccepted = async ({ answer, from }) => {
      console.log("VideoCall: Call accepted event received, from:", from);

      // Prevent duplicate processing
      if (callAcceptedRef.current) {
        console.log("Ignoring duplicate call:accepted event");
        return;
      }

      // Only process if we're the CALLER (not the receiver who created the answer)
      // Check if we have selectedUser (caller) and not incomingCallData (receiver)
      const isCallerReceivingAnswer = selectedUser && !incomingCallData;

      console.log("Am I the caller receiving answer?", isCallerReceivingAnswer);
      console.log("Selected user:", selectedUser?._id);
      console.log("Incoming call data:", incomingCallData?.from);

      if (!isCallerReceivingAnswer) {
        console.log(
          "Ignoring call:accepted - I'm the receiver, not the caller"
        );
        return;
      }

      console.log("Answer SDP:", answer?.sdp?.substring(0, 200));
      if (peerConnection) {
        // Check signaling state before setting remote description
        const signalingState = peerConnection.signalingState;
        console.log("Current signaling state:", signalingState);

        if (signalingState !== "have-local-offer") {
          console.log(
            `Ignoring call:accepted - wrong signaling state: ${signalingState} (expected: have-local-offer)`
          );
          return;
        }

        try {
          // Mark as accepted before processing to prevent race conditions
          callAcceptedRef.current = true;
          wasCallAcceptedRef.current = true; // Track that call was ever accepted

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          console.log("Remote description set from answer");
          console.log(
            "Remote tracks after answer:",
            peerConnection.getReceivers().map((r) => r.track?.kind)
          );
          console.log(
            "Transceivers:",
            peerConnection
              .getTransceivers()
              .map((t) => `${t.mid}: ${t.direction}`)
          );

          setCallAccepted(true);
          setCallStartTime(Date.now()); // Start tracking call duration
          callStartTimeRef.current = Date.now(); // Also save in ref
          setIsCalling(false);

          // Process any pending ICE candidates
          pendingCandidatesRef.current.forEach(async (candidate) => {
            try {
              await peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            } catch (err) {
              console.error("Error adding queued candidate:", err);
            }
          });
          pendingCandidatesRef.current = [];
        } catch (error) {
          console.error("Error setting remote description:", error);
          // Reset on error so user can retry
          callAcceptedRef.current = false;
        }
      }
    };

    socket.on("call:accepted", handleCallAccepted);

    socket.on("call:rejected", () => {
      console.log("VideoCall: Call rejected");
      endCall();
      alert("Call was rejected");
    });

    socket.on("call:ended", (data) => {
      console.log("VideoCall: Call ended by other party", data);
      // If other person already saved history, skip saving on our side
      endCall(data?.historyAlreadySaved || false);
    });

    socket.on("ice:candidate", async ({ candidate }) => {
      console.log("Received ICE candidate");
      if (peerConnection && candidate) {
        if (peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("ICE candidate added successfully");
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        } else {
          console.log("Queuing ICE candidate until remote description is set");
          pendingCandidatesRef.current.push(candidate);
        }
      } else if (!peerConnection) {
        console.log("Peer connection not ready yet, queuing candidate");
        pendingCandidatesRef.current.push(candidate);
      }
    });

    return () => {
      console.log("VideoCall: Cleaning up socket listeners");
      socket.off("call:accepted", handleCallAccepted);
      socket.off("call:rejected");
      socket.off("call:ended");
      socket.off("ice:candidate");
    };
  }, [socket, peerConnection, selectedUser, incomingCallData]);

  const endCall = async (skipSave = false) => {
    console.log("VideoCall: Ending call", { skipSave });

    // Calculate call duration using ref to avoid state timing issues
    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0;
    const otherUserId = selectedUser?._id || incomingCallData?.from || callerId;

    console.log("Duration calculation:", {
      callStartTimeRef: callStartTimeRef.current,
      now: Date.now(),
      duration,
    });

    // Save call history only if not told to skip (skipSave is true when other person already saved)
    if (otherUserId && user?._id && !skipSave) {
      try {
        const status = wasCallAcceptedRef.current ? "completed" : "missed";
        await axios.post(
          `${API_BASE_URL}/api/v1/message/call-history`,
          {
            receiverId: otherUserId,
            duration,
            status,
            callType: "video",
          },
          {
            withCredentials: true,
          }
        );
        console.log("Call history saved with duration:", duration);
      } catch (error) {
        console.error("Failed to save call history:", error);
      }
    }

    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      setRemoteStream(null);
    }

    // Notify the other party
    if (socket && otherUserId) {
      console.log("Notifying other party about call end:", otherUserId);
      socket.emit("call:end", {
        to: otherUserId,
        historyAlreadySaved: !skipSave,
      });
    }

    setIsCalling(false);
    setCallAccepted(false);
    setIsReceivingCall(false);
    setCallerId(null);
    setCallStartTime(null);
    pendingCandidatesRef.current = [];

    console.log("VideoCall: Call ended, closing component");
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Update local video element when localStream changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      console.log("Local video element updated");
    }
  }, [localStream]);

  // Update remote video element when remoteStream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log(
        "Remote video element updated with stream:",
        remoteStream.getTracks()
      );
    }
  }, [remoteStream]);

  useEffect(() => {
    return () => {
      console.log("VideoCall: Component unmounting, cleaning up");
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      // Reset flags on cleanup to allow new calls
      callAcceptedRef.current = false;
      callInitiatedRef.current = false;
    };
  }, [localStream, peerConnection]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
        <h2 className="text-xl font-semibold">
          {isReceivingCall
            ? "Incoming Call..."
            : isCalling
            ? "Calling..."
            : callAccepted
            ? `Call with ${selectedUser?.username}`
            : "Video Call"}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={endCall}
          className="text-white hover:bg-gray-800"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Remote Video (Full Screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${
            !remoteStream ? "hidden" : ""
          }`}
        />

        {/* Placeholder when no remote video */}
        {!remoteStream && (
          <div className="flex flex-col items-center justify-center text-white">
            <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center text-4xl mb-4">
              {selectedUser?.username?.charAt(0).toUpperCase()}
            </div>
            <p className="text-lg">
              {isReceivingCall
                ? "Incoming call..."
                : isCalling
                ? "Calling..."
                : "No video"}
            </p>
          </div>
        )}

        {/* Local Video (Picture in Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6 flex justify-center items-center gap-4">
        {!callAccepted && isCalling ? (
          <div className="text-white text-lg">Calling...</div>
        ) : !callAccepted && isReceivingCall ? (
          <div className="text-white text-lg">Connecting...</div>
        ) : (
          <>
            <Button
              onClick={toggleMute}
              variant={isMuted ? "destructive" : "secondary"}
              className="rounded-full w-14 h-14"
            >
              {isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            <Button
              onClick={toggleVideo}
              variant={isVideoOff ? "destructive" : "secondary"}
              className="rounded-full w-14 h-14"
            >
              {isVideoOff ? (
                <VideoOff className="h-5 w-5" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>
            <Button
              onClick={endCall}
              className="bg-red-600 hover:bg-red-700 rounded-full w-16 h-16"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

VideoCall.propTypes = {
  selectedUser: PropTypes.shape({
    _id: PropTypes.string,
    username: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  incomingCallData: PropTypes.shape({
    from: PropTypes.string,
    offer: PropTypes.object,
  }),
};

export default VideoCall;
