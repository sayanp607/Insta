import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { getSocket } from "@/socketInstance,";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Phone, PhoneOff } from "lucide-react";

const IncomingCallNotification = ({ onAccept, onReject }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const { suggestedUsers } = useSelector((store) => store.auth);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) {
      console.log("IncomingCallNotification: No socket available");
      return;
    }

    console.log("IncomingCallNotification: Setting up socket listeners");

    const handleIncomingCall = ({ from, offer }) => {
      console.log("IncomingCallNotification: Received call from", from);
      console.log("Suggested users:", suggestedUsers);

      // Find the caller's information
      const caller = suggestedUsers.find((user) => user._id === from);
      console.log("Found caller:", caller);

      setIncomingCall({
        from,
        offer,
        caller,
      });
    };

    const handleCallEnded = () => {
      console.log("IncomingCallNotification: Call ended");
      setIncomingCall(null);
    };

    const handleCallRejected = () => {
      console.log("IncomingCallNotification: Call rejected");
      setIncomingCall(null);
    };

    const handleCallAccepted = () => {
      console.log(
        "IncomingCallNotification: Call accepted, closing notification"
      );
      setIncomingCall(null);
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:accepted", handleCallAccepted);

    return () => {
      console.log("IncomingCallNotification: Cleaning up socket listeners");
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:accepted", handleCallAccepted);
    };
  }, [socket, suggestedUsers]);

  const handleAccept = () => {
    if (incomingCall) {
      onAccept(incomingCall);
      setIncomingCall(null);
    }
  };

  const handleReject = () => {
    if (incomingCall) {
      onReject(incomingCall.from);
      setIncomingCall(null);
    }
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex flex-col items-center">
          {/* Caller Avatar */}
          <Avatar className="w-24 h-24 mb-4">
            <AvatarImage
              src={incomingCall.caller?.profilePicture}
              alt="caller"
            />
            <AvatarFallback className="text-3xl">
              {incomingCall.caller?.username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Caller Name */}
          <h2 className="text-2xl font-bold mb-2">
            {incomingCall.caller?.username || "Unknown User"}
          </h2>

          {/* Call Status */}
          <p className="text-gray-600 mb-6">Incoming video call...</p>

          {/* Ringing Animation */}
          <div className="flex gap-1 mb-6">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div
              className="w-3 h-3 bg-green-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="w-3 h-3 bg-green-500 rounded-full animate-pulse"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full">
            <Button
              onClick={handleReject}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-6 rounded-full text-lg font-semibold"
            >
              <PhoneOff className="h-6 w-6 mr-2" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 rounded-full text-lg font-semibold"
            >
              <Phone className="h-6 w-6 mr-2" />
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

IncomingCallNotification.propTypes = {
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
};

export default IncomingCallNotification;
