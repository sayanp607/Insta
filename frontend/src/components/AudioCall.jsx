import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { getSocket } from "@/socketInstance,";
import { Button } from "./ui/button";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useSelector } from "react-redux";
import axios from "axios";
import { API_BASE_URL } from "@/main";

const AudioCall = ({ selectedUser, onClose, incomingCallData }) => {
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const { user } = useSelector((store) => store.auth);

  const remoteAudioRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callAcceptedRef = useRef(false);
  const callInitiatedRef = useRef(false);
  const callStartTimeRef = useRef(null);
  const socket = getSocket();

  const configuration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
    ],
  };

  const getMediaStream = async () => {
    try {
      console.log("Requesting microphone access...");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support microphone access");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log("Audio stream obtained successfully");
      console.log("Audio tracks:", stream.getAudioTracks().length);
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      let errorMessage = "Failed to access microphone. ";

      if (error.name === "NotAllowedError") {
        errorMessage +=
          "Please allow microphone access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No microphone found on your device.";
      } else if (error.name === "NotReadableError") {
        errorMessage += "Your microphone is being used by another application.";
      } else {
        errorMessage += error.message;
      }

      alert(errorMessage);
      onClose();
      return null;
    }
  };

  const createPeerConnection = (stream, targetUserId) => {
    const pc = new RTCPeerConnection(configuration);
    console.log("Creating peer connection for:", targetUserId);

    stream.getTracks().forEach((track) => {
      console.log("Adding track:", track.kind);
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      console.log(
        "Received remote track:",
        event.track.kind,
        "enabled:",
        event.track.enabled
      );
      console.log("Event streams:", event.streams);

      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        console.log(
          "Setting remote stream with tracks:",
          remoteStream.getTracks().map((t) => `${t.kind}: ${t.enabled}`)
        );

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current
            .play()
            .then(() => {
              console.log("Remote audio playing");
            })
            .catch((err) => {
              console.log("Play error:", err);
            });
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to:", targetUserId);
        socket.emit("ice:candidate", {
          to: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state changed:", pc.connectionState);
      if (pc.connectionState === "connected" && !callStartTimeRef.current) {
        callStartTimeRef.current = Date.now();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    setPeerConnection(pc);
    return pc;
  };

  // Handle outgoing call
  useEffect(() => {
    if (
      selectedUser &&
      !incomingCallData &&
      !isCalling &&
      socket &&
      !callInitiatedRef.current
    ) {
      console.log("Starting outgoing audio call to:", selectedUser);
      callInitiatedRef.current = true;
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
            offerToReceiveVideo: false,
          });
          await pc.setLocalDescription(offer);

          console.log("Created audio offer");

          const currentUserId = socket.io?.opts?.query?.userId;
          console.log(
            "Emitting audio_call:initiate from:",
            currentUserId,
            "to:",
            selectedUser._id
          );

          socket.emit("audio_call:initiate", {
            to: selectedUser._id,
            from: currentUserId,
            offer,
          });

          console.log("Audio call initiated successfully");
        } catch (error) {
          console.error("Error starting audio call:", error);
          setIsCalling(false);
        }
      })();
    }
  }, [selectedUser, incomingCallData, socket]);

  // Handle incoming call
  useEffect(() => {
    if (incomingCallData) {
      console.log("Incoming audio call data received:", incomingCallData);
      (async () => {
        const stream = await getMediaStream();
        if (!stream) return;

        const pc = createPeerConnection(stream, incomingCallData.from);

        try {
          console.log("Setting remote description from offer");
          await pc.setRemoteDescription(
            new RTCSessionDescription(incomingCallData.offer)
          );
          console.log("Remote description set from offer");
          console.log(
            "Remote tracks available:",
            pc.getReceivers().map((r) => r.track?.kind)
          );

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          console.log("Created audio answer");

          const currentUserId = socket.io?.opts?.query?.userId;
          socket.emit("audio_call:accept", {
            to: incomingCallData.from,
            from: currentUserId,
            answer,
          });

          setCallAccepted(true);
          callAcceptedRef.current = true;
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = Date.now(); // Start tracking duration
          }
          console.log(
            "Audio call accepted, start time set:",
            callStartTimeRef.current
          );
        } catch (error) {
          console.error("Error handling incoming audio call:", error);
        }
      })();
    }
  }, [incomingCallData]);

  // Handle call accepted
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = async ({ answer, from }) => {
      console.log("AudioCall: Call accepted event received, from:", from);

      if (callAcceptedRef.current) {
        console.log("Ignoring duplicate call:accepted event");
        return;
      }

      const isCallerReceivingAnswer = selectedUser && !incomingCallData;

      console.log("Am I the caller receiving answer?", isCallerReceivingAnswer);

      if (!isCallerReceivingAnswer) {
        console.log(
          "Ignoring call:accepted - I'm the receiver, not the caller"
        );
        return;
      }

      if (peerConnection) {
        const signalingState = peerConnection.signalingState;
        console.log("Current signaling state:", signalingState);

        if (signalingState !== "have-local-offer") {
          console.log(
            `Ignoring call:accepted - wrong signaling state: ${signalingState}`
          );
          return;
        }

        try {
          callAcceptedRef.current = true;

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          console.log("Remote description set from answer");

          setCallAccepted(true);
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = Date.now(); // Start tracking duration
          }
          setIsCalling(false);

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
          callAcceptedRef.current = false;
        }
      }
    };

    socket.on("audio_call:accepted", handleCallAccepted);

    socket.on("audio_call:rejected", () => {
      console.log("AudioCall: Call rejected");
      endCall();
      alert("Call was rejected");
    });

    socket.on("audio_call:ended", (data) => {
      console.log("AudioCall: Call ended by other party", data);
      endCall(data?.historyAlreadySaved || false);
    });

    socket.on("ice:candidate", async ({ candidate }) => {
      console.log("Received ICE candidate");
      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("ICE candidate added successfully");
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      } else if (peerConnection) {
        console.log("Queuing ICE candidate until remote description is set");
        pendingCandidatesRef.current.push(candidate);
      } else if (!peerConnection) {
        console.log("Peer connection not ready yet, queuing candidate");
        pendingCandidatesRef.current.push(candidate);
      }
    });

    return () => {
      console.log("AudioCall: Cleaning up socket listeners");
      socket.off("audio_call:accepted", handleCallAccepted);
      socket.off("audio_call:rejected");
      socket.off("audio_call:ended");
      socket.off("ice:candidate");
    };
  }, [socket, peerConnection, selectedUser, incomingCallData]);

  // Call duration timer
  useEffect(() => {
    if (
      callAccepted ||
      (incomingCallData && peerConnection?.connectionState === "connected")
    ) {
      const interval = setInterval(() => {
        if (callStartTimeRef.current) {
          setCallDuration(
            Math.floor((Date.now() - callStartTimeRef.current) / 1000)
          );
        } else {
          setCallDuration((prev) => prev + 1);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callAccepted, incomingCallData, peerConnection]);

  const endCall = async (skipSave = false) => {
    console.log("AudioCall: Ending call", { skipSave });

    // Calculate call duration
    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0;
    const targetUserId = selectedUser?._id || incomingCallData?.from;

    // Save call history only if not told to skip (skipSave is true when other person already saved)
    if (targetUserId && user?._id && !skipSave) {
      try {
        const status = callAcceptedRef.current ? "completed" : "missed";
        await axios.post(
          `${API_BASE_URL}/api/v1/message/call-history`,
          {
            receiverId: targetUserId,
            duration,
            status,
            callType: "audio",
          },
          {
            withCredentials: true,
          }
        );
        console.log("Audio call history saved with duration:", duration);
      } catch (error) {
        console.error("Failed to save audio call history:", error);
      }
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }

    if (targetUserId && socket) {
      socket.emit("audio_call:end", {
        to: targetUserId,
        historyAlreadySaved: !skipSave,
      });
    }

    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerOff(remoteAudioRef.current.muted);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      console.log("AudioCall: Component unmounting, cleaning up");
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      callAcceptedRef.current = false;
      callInitiatedRef.current = false;
    };
  }, [localStream, peerConnection]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 z-50 flex flex-col items-center justify-center">
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="flex flex-col items-center justify-center text-white max-w-md w-full px-6">
        {/* Avatar */}
        <div className="mb-8">
          <div className="relative">
            <Avatar className="w-32 h-32 border-4 border-white/20">
              <AvatarImage
                src={
                  selectedUser?.profilePicture ||
                  incomingCallData?.caller?.profilePicture
                }
                alt="profile"
              />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-4xl">
                {(selectedUser?.username || incomingCallData?.caller?.username)
                  ?.charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Pulse animation for calling */}
            {isCalling && (
              <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping"></div>
            )}
          </div>
        </div>

        {/* User Info */}
        <h2 className="text-2xl font-semibold mb-2">
          {selectedUser?.username || incomingCallData?.caller?.username}
        </h2>

        {/* Call Status */}
        <p className="text-gray-300 mb-8">
          {isCalling
            ? "Calling..."
            : callAccepted || (incomingCallData && peerConnection)
            ? `${formatDuration(callDuration)}`
            : "Connecting..."}
        </p>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {/* Mute Button */}
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="icon"
            className={`w-14 h-14 rounded-full ${
              isMuted
                ? "bg-white text-gray-900"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isMuted ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>

          {/* End Call Button */}
          <Button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>

          {/* Speaker Button */}
          <Button
            onClick={toggleSpeaker}
            variant="ghost"
            size="icon"
            className={`w-14 h-14 rounded-full ${
              isSpeakerOff
                ? "bg-white text-gray-900"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isSpeakerOff ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Additional Info */}
        <p className="text-gray-400 text-sm">
          {peerConnection?.connectionState === "connected"
            ? "Connected"
            : peerConnection?.connectionState === "connecting"
            ? "Establishing connection..."
            : ""}
        </p>
      </div>
    </div>
  );
};

AudioCall.propTypes = {
  selectedUser: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  incomingCallData: PropTypes.object,
};

export default AudioCall;
