import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Plus } from 'lucide-react';

const StoryItem = ({ author, onClick, onAddClick, isCurrentUser, hasUnseenStories }) => {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[75px] cursor-pointer group" onClick={onClick}>
      <div className={`relative p-[2px] rounded-full ${hasUnseenStories ? 'bg-gradient-to-tr from-[#FFD600] via-[#FF7A00] to-[#FF00D6]' : 'bg-[#262626]'}`}>
        <div className="p-[2px] bg-black rounded-full">
          <Avatar className="w-16 h-16 border-2 border-black">
            <AvatarImage src={author?.profilePicture} alt={author?.username} className="object-cover" />
            <AvatarFallback className="bg-zinc-800 text-white text-xs">
              {author?.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {isCurrentUser && (
          <div 
            onClick={onAddClick}
            className="absolute bottom-0 right-0 bg-[#0095F6] rounded-full p-[2px] border-2 border-black text-white hover:scale-110 transition-transform"
          >
            <Plus size={14} strokeWidth={4} />
          </div>
        )}
      </div>
      <span className="text-[11px] text-white w-full text-center truncate px-1">
        {isCurrentUser ? 'Your Story' : author?.username}
      </span>
    </div>
  );
};

export default StoryItem;
