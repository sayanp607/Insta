import React from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { FaRegCircleUser } from "react-icons/fa6";
import { useSelector } from "react-redux";

const SendDialog = ({ open, setOpen }) => {
  const { suggestedUsers } = useSelector((store) => store.auth); // assuming you have all users in store

  const handleSend = (userId) => {
    // send logic here
    console.log("Send post to user:", userId);
    // Optionally: toast.success("Sent successfully!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-md p-0 border-gray-300 bg-[#FAF6F0] overflow-hidden rounded-xl shadow-2xl"
        onInteractOutside={() => setOpen(false)}
      >
        <div className="p-4 border-b border-gray-300 text-center">
          <h2 className="text-md font-bold text-[#1A1A1A]">Share</h2>
        </div>
        <div className="p-4 flex flex-col gap-4 max-h-[400px] overflow-y-auto scrollbar-hide">
          {suggestedUsers?.map((user) => (
            <div key={user._id} className="flex items-center justify-between hover:bg-[#FFFFFF] p-2 rounded-xl transition-colors">
              <div className="flex gap-3 items-center">
                <Avatar className="w-10 h-10 border border-gray-300">
                  <AvatarImage src={user.profilePicture} alt={user.username} />
                  <AvatarFallback className="bg-[#F1E8DF]">CN</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#1A1A1A]">{user.username}</span>
                  <span className="text-xs text-gray-600 line-clamp-1">{user.bio || "Social Media Enthusiast"}</span>
                </div>
              </div>
              <Button
                onClick={() => handleSend(user._id)}
                className="bg-[#0095F6] hover:bg-[#1877F2] text-[#1A1A1A] text-xs font-bold px-6 h-8 rounded-lg"
              >
                Send
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendDialog;
