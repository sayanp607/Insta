import React from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { Music } from 'lucide-react';

const FinalizeStep = ({ image, filter, caption, setCaption, song, user, onPost, onBack, loading, onAISuggest, aiLoading, aiSuggestions, isVideo }) => {
  return (
    <div className="flex flex-col h-[500px] bg-[#121212] overflow-hidden rounded-b-xl border-t border-[#262626]">
      <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto custom-scrollbar">
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-[#262626] bg-black">
            {isVideo ? (
               <video src={image} className="w-full h-full object-cover" style={{ filter }} autoPlay loop muted playsInline />
            ) : (
               <img src={image} className="w-full h-full object-cover" style={{ filter }} alt="Preview" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="w-6 h-6">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold text-white">{user?.username}</span>
            </div>
            <Textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="bg-transparent border-none focus-visible:ring-0 p-0 text-sm h-20 resize-none text-white placeholder:text-gray-600"
            />
            <div className="mt-2">
              <button 
                onClick={onAISuggest}
                disabled={aiLoading}
                className="flex items-center gap-1 text-[10px] font-bold text-[#0095F6] hover:text-[#1877F2] transition-colors uppercase tracking-wider"
              >
                <span className="text-sm">✨</span> {aiLoading ? "Analyzing..." : "Magic Suggest"}
              </button>
              
              {aiSuggestions.length > 0 && (
                <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">AI Suggestions</p>
                  <div className="flex flex-col gap-2">
                    {aiSuggestions.map((s, i) => (
                      <div 
                        key={i} 
                        onClick={() => setCaption(`${s.text}\n\n${s.hashtags}`)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer border border-white/5 transition-all group"
                      >
                        <p className="text-[11px] text-gray-300 group-hover:text-white leading-relaxed">{s.text}</p>
                        <p className="text-[10px] text-[#0095F6] mt-1 font-medium">{s.hashtags}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {song && (
          <div className="bg-[#1a1a1a] p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#262626] rounded-full">
                <Music size={18} className="text-[#0095F6]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{song.title}</h4>
                <p className="text-xs text-gray-500">{song.artist}</p>
              </div>
            </div>
            <span className="text-[10px] bg-[#262626] text-gray-400 px-2 py-1 rounded-full">30s Clip</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#262626]">
            <span className="text-sm text-white">Add Location</span>
            <span className="text-[#0095F6] text-sm cursor-not-allowed">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#262626]">
            <span className="text-sm text-white">Tag People</span>
            <span className="text-[#0095F6] text-sm cursor-not-allowed">Coming soon</span>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#262626] flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={loading} className="text-white hover:bg-[#262626]">Back</Button>
        <Button 
          onClick={onPost} 
          disabled={loading}
          className="bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold px-12"
        >
          {loading ? "Posting..." : "Share"}
        </Button>
      </div>
    </div>
  );
};

export default FinalizeStep;
