import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, MoreHorizontal, Heart, Plus, Users } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { likeStory } from '@/redux/storySlice';
import axios from 'axios';
import { API_BASE_URL } from '@/main';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { markStoryAsViewed } from '@/redux/storySlice';
import { motion, AnimatePresence } from 'framer-motion';

const StoryViewer = ({ open, onOpenChange, storyGroups, initialGroupIndex }) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHighlightDialog, setShowHighlightDialog] = useState(false);
  const [showViewersDialog, setShowViewersDialog] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [newHighlightName, setNewHighlightName] = useState('');
  const { user } = useSelector(store => store.auth);
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Duration for each story (5s for images, dynamic for video)
  const DURATION = currentStory?.mediaType === 'video' ? 15000 : 5000;

  useEffect(() => {
    if (!open) return;
    
    // Reset story index ONLY when group changes or viewer first opens
    setStoryIndex(0);
    setProgress(0);
  }, [groupIndex, open]);

  useEffect(() => {
      if (!open || !currentStory) return;

      const markAsViewed = async () => {
          try {
              dispatch(markStoryAsViewed({ storyId: currentStory._id, userId: user._id }));
              await axios.post(`${API_BASE_URL}/api/v1/story/view/${currentStory._id}`, {}, { withCredentials: true });
          } catch (e) {
              console.log("Error marking story as viewed:", e);
          }
      };
      markAsViewed();
  }, [currentStory?._id, open]);

  useEffect(() => {
    if (!open || isPaused || showHighlightDialog || showViewersDialog) return;

    const interval = 100;
    const step = (interval / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [open, isPaused, storyIndex, groupIndex, DURATION, showHighlightDialog, showViewersDialog]);

  const handleNext = () => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onOpenChange(false);
    }
  };

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      const prevGroup = storyGroups[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  };

  const fetchHighlights = async () => {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/highlight/user/${user._id}`);
        if (res.data.success) setHighlights(res.data.highlights);
    } catch (error) { console.log(error); }
  };

  const handleAddToHighlight = async (highlightId) => {
    try {
        setLoading(true);
        const res = await axios.post(`${API_BASE_URL}/api/v1/highlight/add-story`, {
            highlightId,
            storyId: currentStory._id
        }, { withCredentials: true });
        if (res.data.success) {
            toast.success("Added to highlight!");
            setShowHighlightDialog(false);
        }
    } catch (error) { toast.error("Failed to add"); }
    finally {
      setLoading(false);
    }
  };

  const handleCreateHighlight = async () => {
    try {
        setLoading(true);
        const res = await axios.post(`${API_BASE_URL}/api/v1/highlight/create`, {
            name: newHighlightName,
            storyIds: [currentStory._id]
        }, { withCredentials: true });
        if (res.data.success) {
            toast.success("Highlight created!");
            setNewHighlightName('');
            setShowHighlightDialog(false);
            fetchHighlights();
        }
    } catch (error) { toast.error("Failed to create"); }
    finally {
      setLoading(false);
    }
  };

  const handleLikeStory = async () => {
    try {
        dispatch(likeStory({ storyId: currentStory._id, userId: user._id }));
        const res = await axios.post(`${API_BASE_URL}/api/v1/story/like/${currentStory._id}`, {}, { withCredentials: true });
        if (res.data.success) {
            toast.success(res.data.message);
        }
    } catch (error) { 
        toast.error("Failed to like");
        // Rollback on error
        dispatch(likeStory({ storyId: currentStory._id, userId: user._id }));
    }
  };

  const fetchViewers = async () => {
    try {
        if (!currentStory?._id) return;
        console.log("Fetching viewers for story:", currentStory._id);
        const res = await axios.get(`${API_BASE_URL}/api/v1/story/viewers/${currentStory._id}`, { withCredentials: true });
        console.log("Fetched viewers result:", res.data);
        if (res.data.success) setViewers(res.data.viewers);
    } catch (error) { 
        console.error("Error fetching viewers:", error); 
    }
  };

  useEffect(() => {
    if (showHighlightDialog && user) fetchHighlights();
  }, [showHighlightDialog, user]);

  useEffect(() => {
    if (showViewersDialog && currentStory?._id) fetchViewers();
  }, [showViewersDialog, currentStory?._id]);

  if (!currentStory) return null;
  const isLiked = currentStory.likes?.some(id => id.toString() === user?._id?.toString());
  const viewersCount = currentStory.viewers?.length || 0;
  const likesCount = currentStory.likes?.length || 0;
  
  const hasUserLiked = (viewerId) => {
     return currentStory.likes?.some(id => id.toString() === viewerId.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full h-[90vh] p-0 bg-transparent border-none overflow-hidden outline-none">
        <DialogTitle className="sr-only">Story Viewer</DialogTitle>
        <DialogDescription className="sr-only">Viewing stories from {currentGroup.author.username}</DialogDescription>
        <div className="relative w-full h-full bg-zinc-900 rounded-lg overflow-hidden flex flex-col items-center justify-center">
          
          {/* Progress Bars */}
          <div className="absolute top-4 left-0 right-0 z-50 px-4 flex gap-1">
            {currentGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-100 linear"
                  style={{ 
                    width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-8 left-0 right-0 z-50 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-white/20">
                <AvatarImage src={currentGroup.author.profilePicture} />
                <AvatarFallback>{currentGroup.author.username[0]}</AvatarFallback>
              </Avatar>
              <span className="text-[#1A1A1A] font-bold text-sm drop-shadow-md">
                {currentGroup.author.username}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[#1A1A1A]">
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button onClick={() => onOpenChange(false)}>
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div className="w-full h-full flex items-center justify-center relative">
            {currentStory.mediaType === 'video' ? (
              <video 
                ref={videoRef}
                src={currentStory.mediaUrl}
                autoPlay
                muted={isMuted}
                onEnded={handleNext}
                className="w-full h-full object-cover"
              />
            ) : (
                <img 
                    src={currentStory.mediaUrl}
                    alt="story"
                    className="w-full h-full object-cover"
                />
            )}

            {/* Tap areas */}
            <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
                <div className="w-1/3 h-full cursor-pointer" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} />
                <div className="w-1/3 h-full cursor-pointer" onClick={handleNext} />
            </div>
          </div>

          {/* Music Overlay if exists */}
          {currentStory.song && (
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center pointer-events-none">
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/30 animate-pulse">
                 <img src={currentStory.song.thumbnail} className="w-6 h-6 rounded-sm" />
                 <span className="text-[#1A1A1A] text-xs font-bold truncate max-w-[150px]">
                    {currentStory.song.title} • {currentStory.song.artist}
                 </span>
              </div>
              {/* Optional audio element if we want sound for images */}
              {!isMuted && currentStory.mediaType === 'image' && currentStory.song && (
                <audio 
                    autoPlay 
                    src={currentStory.song.url} 
                    onEnded={handleNext}
                />
              )}
            </div>
          )}

          {/* Bottom Actions for Owner / Viewer */}
          <div className="absolute bottom-4 left-0 right-0 z-50 px-4 flex items-center justify-between">
            {/* Viewer count for owner */}
            {user?._id === currentGroup.author._id ? (
                <button 
                    onClick={() => setShowViewersDialog(true)}
                    className="flex items-center gap-1 text-[#1A1A1A]/80 text-[10px] font-bold bg-[#FAF6F0]/20 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-[#FAF6F0]/40 transition-colors"
                >
                    <Users size={12} />
                    <span>{viewersCount} viewers</span>
                    {likesCount > 0 && <span> • {likesCount} likes</span>}
                </button>
            ) : (
                <div /> // Spacer
            )}

            <div className="flex items-center gap-4">
               {/* Highlight button for owner */}
               {user?._id === currentGroup.author._id && (
                  <button 
                  onClick={() => setShowHighlightDialog(true)}
                  className="flex flex-col items-center gap-1 text-[#1A1A1A] hover:scale-110 transition-transform"
                  >
                    <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center bg-[#FAF6F0]/20 backdrop-blur-sm">
                       <MoreHorizontal size={16} />
                    </div>
                    <span className="text-[10px] font-bold">Highlight</span>
                  </button>
               )}

               {/* Like button for everyone */}
               <button 
                onClick={handleLikeStory}
                className="flex flex-col items-center gap-1 text-[#1A1A1A] hover:scale-110 transition-transform"
               >
                 <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center bg-[#FAF6F0]/20 backdrop-blur-sm">
                    <Heart size={16} fill={isLiked ? "#ee4956" : "none"} className={isLiked ? "text-[#ee4956]" : "text-[#1A1A1A]"} />
                 </div>
                 <span className="text-[10px] font-bold">{isLiked ? 'Liked' : 'Like'}</span>
               </button>
            </div>
          </div>
        </div>

        {/* Highlight Selection Dialog */}
        <Dialog open={showHighlightDialog} onOpenChange={setShowHighlightDialog}>
            <DialogContent className="sm:max-w-xs bg-[#FAF6F0] border-gray-300 p-0 overflow-hidden">
                <DialogTitle className="sr-only">Add to Highlight</DialogTitle>
                <DialogDescription className="sr-only">Choose a highlight to add this story to</DialogDescription>
                <div className="p-4 border-b border-gray-300 flex justify-between items-center">
                    <h2 className="text-[#1A1A1A] font-bold">Add to Highlight</h2>
                    <X size={20} className="text-gray-600 cursor-pointer" onClick={() => setShowHighlightDialog(false)} />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-4 space-y-4">
                    {/* Create New */}
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <input 
                                value={newHighlightName}
                                onChange={(e) => setNewHighlightName(e.target.value)}
                                placeholder="New Highlight"
                                className="flex-1 bg-[#F1E8DF] border-none text-[#1A1A1A] text-sm rounded px-3 py-2 outline-none"
                            />
                            <Button size="sm" onClick={handleCreateHighlight} className="bg-[#0095F6] hover:bg-[#1877F2]">
                                <Plus size={16} />
                            </Button>
                        </div>
                    </div>

                    {/* Existing Highlights */}
                    <div className="grid grid-cols-3 gap-3">
                        {highlights.map(h => (
                            <button key={h._id} onClick={() => handleAddToHighlight(h._id)} className="flex flex-col items-center gap-1 group">
                                <div className="w-14 h-14 rounded-full border border-gray-300 overflow-hidden group-hover:opacity-80">
                                    <img src={h.cover} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[10px] text-gray-600 truncate w-full text-center">{h.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Viewers List Dialog */}
        <Dialog open={showViewersDialog} onOpenChange={setShowViewersDialog}>
            <DialogContent className="sm:max-w-xs bg-[#FAF6F0] border-gray-300 p-0 overflow-hidden">
                <DialogTitle className="sr-only">Story Viewers</DialogTitle>
                <DialogDescription className="sr-only">List of people who viewed this story</DialogDescription>
                <div className="p-4 border-b border-gray-300 flex justify-between items-center">
                    <h2 className="text-[#1A1A1A] font-bold">Viewers</h2>
                    <X size={20} className="text-gray-600 cursor-pointer" onClick={() => setShowViewersDialog(false)} />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {viewers.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm italic">No views yet</div>
                    ) : (
                        viewers.map(v => (
                            <div key={v._id} className="flex items-center justify-between p-2 hover:bg-[#FFFFFF] rounded-lg transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={v.profilePicture} />
                                        <AvatarFallback>{v.username[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-[#1A1A1A] text-sm font-bold">{v.username}</span>
                                        <span className="text-zinc-500 text-xs">Viewed your story</span>
                                    </div>
                                </div>
                                {hasUserLiked(v._id) && (
                                    <Heart size={14} fill="#ee4956" className="text-[#ee4956]" />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>

        {/* Navigation Arrows (visible on hover) */}
        <button 
          onClick={handlePrev} 
          className="absolute -left-16 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-[#1A1A1A] transition-all hidden md:block"
        >
          <ChevronLeft size={30} />
        </button>
        <button 
          onClick={handleNext} 
          className="absolute -right-16 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-[#1A1A1A] transition-all hidden md:block"
        >
          <ChevronRight size={30} />
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewer;
