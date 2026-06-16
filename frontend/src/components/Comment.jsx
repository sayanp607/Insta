import React, { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useSelector } from "react-redux";

const Comment = ({ comment }) => {
  const { targetCommentId } = useSelector((store) => store.post);
  const isTarget = targetCommentId === comment?._id;
  const commentRef = useRef(null);

  useEffect(() => {
    if (isTarget && commentRef.current) {
        setTimeout(() => {
            commentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
    }
  }, [isTarget]);

  return (
    <div 
        ref={commentRef}
        className={`my-4 flex gap-3 items-start group transition-all duration-500 ${isTarget ? "bg-white/10 -mx-4 px-4 py-2 rounded-lg ring-1 ring-white/20" : ""}`}
    >
      <Avatar className="w-8 h-8 border border-[#262626]">
        <AvatarImage src={comment?.author?.profilePicture} />
        <AvatarFallback className="bg-[#262626]">CN</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <h1 className="text-sm text-white">
          <span className="font-bold mr-2 hover:text-gray-400 cursor-pointer transition-colors">
            {comment?.author?.username}
          </span>
          <span className="font-normal text-gray-300">{comment?.text}</span>
        </h1>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold">
          <span>1d</span>
          <span className="cursor-pointer hover:text-white transition-colors">Reply</span>
        </div>
      </div>
    </div>
  );
};

export default Comment;
