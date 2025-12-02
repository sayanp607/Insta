/* eslint-disable react/prop-types */
import { useState } from "react";
import { Button } from "./ui/button";
import { Pin, X, Calendar } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/main";

const PinMessageDialog = ({ message, onClose, onPinSuccess }) => {
  const [selectedDays, setSelectedDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const handlePin = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/message/pin`,
        { messageId: message._id, days: selectedDays },
        { withCredentials: true }
      );
      if (res.data.success) {
        onPinSuccess(res.data.pinnedMessage);
        onClose();
      }
    } catch (error) {
      console.error("Failed to pin message:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full transform transition-all animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                <Pin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Pin Message
                </h3>
                <p className="text-sm text-gray-500">Choose duration</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Message Preview */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-700 line-clamp-3">
              {message.message || "Voice/File message"}
            </p>
          </div>

          {/* Duration Options */}
          <div className="space-y-3 mb-6">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Select Duration
            </p>
            {[7, 15, 30].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedDays(days)}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  selectedDays === days
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedDays === days
                          ? "border-yellow-500 bg-yellow-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedDays === days && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900">
                      {days} Days
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Until{" "}
                    {new Date(
                      Date.now() + days * 24 * 60 * 60 * 1000
                    ).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-11 rounded-xl font-medium hover:bg-gray-50 border-gray-300"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePin}
              disabled={loading}
              className="flex-1 h-11 rounded-xl font-medium bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white shadow-lg"
            >
              <Pin className="w-4 h-4 mr-2" />
              {loading ? "Pinning..." : "Pin Message"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PinMessageDialog;
