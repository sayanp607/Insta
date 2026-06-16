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
        className="max-w-md p-0 border-[#262626] bg-[#121212] overflow-hidden rounded-xl shadow-2xl"
        onInteractOutside={() => setOpen(false)}
      >
        <div className="p-4 border-b border-[#262626] text-center">
          <h2 className="text-md font-bold text-white">Share</h2>
        </div>
        <div className="p-4 flex flex-col gap-4 max-h-[400px] overflow-y-auto scrollbar-hide">
          {suggestedUsers?.map((user) => (
            <div key={user._id} className="flex items-center justify-between hover:bg-[#1a1a1a] p-2 rounded-xl transition-colors">
              <div className="flex gap-3 items-center">
                <Avatar className="w-10 h-10 border border-[#262626]">
                  <AvatarImage src={user.profilePicture} alt={user.username} />
                  <AvatarFallback className="bg-[#262626]">CN</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{user.username}</span>
                  <span className="text-xs text-gray-500 line-clamp-1">{user.bio || "Social Media Enthusiast"}</span>
                </div>
              </div>
              <Button
                onClick={() => handleSend(user._id)}
                className="bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-bold px-6 h-8 rounded-lg"
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
