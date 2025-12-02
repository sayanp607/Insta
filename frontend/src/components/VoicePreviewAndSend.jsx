/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { API_BASE_URL } from "@/main";
import axios from "axios";
import { Mic, Send, X } from "lucide-react";

const VoicePreviewAndSend = ({
  audioBlob,
  selectedUser,
  messages,
  dispatch,
  setMessages,
  resetAudio,
  setVoiceError,
}) => {
  const [duration, setDuration] = useState(null);
  const audioRef = useRef();

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration);
      };
    }
  }, [audioBlob]);

  const handleSend = async () => {
    if (!selectedUser?._id || !audioBlob) return;
    setVoiceError("");
    const formData = new FormData();
    formData.append("voice", audioBlob, `voice_${Date.now()}.webm`);
    // Add duration (rounded to 1 decimal)
    formData.append("voiceDuration", duration ? Math.round(duration) : 0);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/message/send-voice/${selectedUser._id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (res.data.success) {
        dispatch(setMessages([...messages, res.data.newMessage]));
        resetAudio();
        setVoiceError("");
      }
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setVoiceError("Daily voice message limit reached (10 per day)");
      } else {
        setVoiceError("Voice message upload failed");
      }
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={resetAudio}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full transform transition-all animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Voice Message
                </h3>
                <p className="text-sm text-gray-500">Preview and send</p>
              </div>
            </div>
            <button
              onClick={resetAudio}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Audio Player */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6">
            <audio
              ref={audioRef}
              controls
              src={URL.createObjectURL(audioBlob)}
              className="w-full"
            />
            {duration !== null && (
              <div className="flex items-center justify-center mt-3 text-sm text-gray-600">
                <span className="font-medium">Duration:</span>
                <span className="ml-2 font-mono">
                  {Math.floor(duration / 60)}:
                  {(Math.round(duration) % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={resetAudio}
              variant="outline"
              className="flex-1 h-11 rounded-xl font-medium hover:bg-gray-50 border-gray-300"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              className="flex-1 h-11 rounded-xl font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default VoicePreviewAndSend;
