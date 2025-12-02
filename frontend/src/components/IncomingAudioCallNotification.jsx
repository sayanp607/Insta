import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { getSocket } from "@/socketInstance,";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Phone, PhoneOff } from "lucide-react";

const IncomingAudioCallNotification = ({ onAccept, onReject }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const { suggestedUsers } = useSelector((store) => store.auth);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on("audio_call:incoming", ({ from, offer }) => {
      console.log(
        "IncomingAudioCallNotification: Received audio call from",
        from
      );
      console.log("Suggested users:", suggestedUsers);

      // Find caller info from suggested users
      const caller = suggestedUsers.find((user) => user._id === from);
      console.log("Found caller:", caller);

      setIncomingCall({
        from,
        offer,
        caller: caller || { username: "Unknown", profilePicture: "" },
      });
    });

    socket.on("audio_call:accepted", () => {
      console.log(
        "IncomingAudioCallNotification: Call accepted, closing notification"
      );
      setIncomingCall(null);
    });

    socket.on("audio_call:rejected", () => {
      console.log("IncomingAudioCallNotification: Call rejected");
      setIncomingCall(null);
    });

    socket.on("audio_call:ended", () => {
      console.log("IncomingAudioCallNotification: Call ended");
      setIncomingCall(null);
    });

    return () => {
      socket.off("audio_call:incoming");
      socket.off("audio_call:accepted");
      socket.off("audio_call:rejected");
      socket.off("audio_call:ended");
    };
  }, [socket, suggestedUsers]);

  const handleAccept = () => {
    console.log("Accepting audio call from:", incomingCall.from);
    onAccept(incomingCall);
    // Don't clear incomingCall here - let the audio_call:accepted event handle it
  };

  const handleReject = () => {
    console.log("Rejecting audio call from:", incomingCall.from);
    onReject(incomingCall.from);
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2">
      <div className="bg-white rounded-2xl shadow-2xl p-6 min-w-[320px] border border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <Avatar className="w-16 h-16">
              <AvatarImage
                src={incomingCall.caller.profilePicture}
                alt="caller"
              />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xl">
                {incomingCall.caller.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Pulse animation */}
            <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping"></div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900">
              {incomingCall.caller.username}
            </h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Incoming audio call...
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-full py-3"
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-full py-3"
          >
            <Phone className="h-5 w-5 mr-2" />
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

IncomingAudioCallNotification.propTypes = {
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
};

export default IncomingAudioCallNotification;
