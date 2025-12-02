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
        className="max-w-md p- space-y14"
        onInteractOutside={() => setOpen(false)}
      >
        <h2 className="text-lg font-semibold">Send to</h2>
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {suggestedUsers?.map((user) => (
            <div key={user._id} className="flex items-center justify-between">
              <div className="flex gap-3 items-center">
                <Avatar>
                  <AvatarImage src={user.profilePicture} alt={user.username} />
                  <AvatarFallback>
                    <FaRegCircleUser />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.username}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => handleSend(user._id)}
                className="text-sm bg-blue-400"
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
