import React, { useRef, useState, useEffect } from "react";
import { Heart, MessageCircle, Send, Music, MoreVertical, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_BASE_URL } from "@/main";
import { useSelector, useDispatch } from "react-redux";
import { setIsGlobalMuted, setSelectedPost } from "@/redux/postSlice";
import ReelsCommentDrawer from "./ReelsCommentDrawer";

const ReelItem = ({ reel, autoOpenComments, targetCommentId }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const dispatch = useDispatch();
  const { user } = useSelector((store) => store.auth);
  const { isGlobalMuted } = useSelector((store) => store.post);
  const [liked, setLiked] = useState(reel.likes.includes(user?._id));
  const [likeCount, setLikeCount] = useState(reel.likes.length);
  const [showHeart, setShowHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [openComments, setOpenComments] = useState(false);

  useEffect(() => {
    if (autoOpenComments) {
      dispatch(setSelectedPost(reel));
      setOpenComments(true);
    }
  }, [autoOpenComments, reel, dispatch]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isGlobalMuted;
      // Try to play if unmuted and in view
      if (!isGlobalMuted && videoRef.current.paused && isInView) {
        videoRef.current.play().catch(e => console.log("Playback failed:", e));
      }
    }
    
    if (audioRef.current && reel.song) {
      if (!isGlobalMuted && isInView) {
        audioRef.current.currentTime = reel.songStart || 0;
        audioRef.current.play().catch(e => console.log("Audio play failed"));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isGlobalMuted, isInView, reel.song]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
          if (entry.isIntersecting) {
            if (videoRef.current) {
              videoRef.current.muted = isGlobalMuted;
              videoRef.current.play().catch(e => console.log("Intersection play failed:", e));
            }
          } else {
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
            if (audioRef.current) audioRef.current.pause();
          }
        });
      },
      { threshold: 0.8 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [isGlobalMuted]);

  const handleLike = async () => {
    try {
      const action = liked ? "dislike" : "like";
      const res = await axios.get(`${API_BASE_URL}/api/v1/post/${reel._id}/${action}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setLiked(!liked);
        setLikeCount(liked ? likeCount - 1 : likeCount + 1);
      }
    } catch (error) {
      console.error("Error liking reel:", error);
    }
  };

  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!liked) handleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    setLastTap(now);
  };

  return (
    <div className="relative h-screen w-full snap-start flex items-center justify-center bg-black overflow-hidden group">
      {/* Video Container */}
      <div 
        className="relative h-full w-full max-w-[450px]"
        onClick={handleDoubleTap}
      >
        <video
          ref={videoRef}
          src={reel.image} 
          className="h-full w-full object-contain"
          loop
          muted={isGlobalMuted} 
          playsInline
        />

        {reel.song && (
          <audio 
            ref={audioRef} 
            src={reel.song.url} 
            loop 
            onTimeUpdate={(e) => {
              if (e.target.currentTime >= (reel.songStart || 0) + 30) {
                e.target.currentTime = reel.songStart || 0;
              }
            }}
          />
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Double Tap Heart Animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <Heart className="w-24 h-24 fill-white text-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio Toggle */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            dispatch(setIsGlobalMuted(!isGlobalMuted));
          }}
          className="absolute top-6 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/20 z-20 hover:bg-black/60 transition-all"
        >
          {isGlobalMuted ? <VolumeX size={20} /> : <Volume2 size={20} className="text-[#0095F6]" />}
        </button>

        {/* Reel Info (Bottom Left) */}
        <div className="absolute bottom-6 left-4 right-16 text-white space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white/20">
              <AvatarImage src={reel.author?.profilePicture} />
              <AvatarFallback>{reel.author?.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <span className="font-bold text-[15px]">{reel.author?.username}</span>
            <button className="px-3 py-1 bg-transparent border border-white/40 rounded-lg text-[12px] font-bold hover:bg-white/10 transition-colors">
              Follow
            </button>
          </div>
          
          <p className="text-[14px] line-clamp-2 leading-relaxed opacity-90">
            {reel.caption}
          </p>

          <div className="flex items-center gap-2 text-[13px] opacity-80">
            <Music className="w-4 h-4" />
            <div className="overflow-hidden w-40">
              <div className="whitespace-nowrap animate-marquee">
                {reel.song?.title ? `${reel.song.title} - ${reel.song.artist}` : "Original Audio"}
              </div>
            </div>
          </div>
        </div>

        {/* Actions (Bottom Right) */}
        <div className="absolute bottom-10 right-2 flex flex-col items-center gap-6 z-10">
          <div className="flex flex-col items-center gap-1.5">
            <button 
              onClick={handleLike}
              className="p-2 transition-transform active:scale-75"
            >
              <Heart className={`w-8 h-8 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
            </button>
            <span className="text-[13px] text-white font-medium">{likeCount}</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <button 
              onClick={() => {
                dispatch(setSelectedPost(reel));
                setOpenComments(true);
              }}
              className="p-2 transition-transform active:scale-75"
            >
              <MessageCircle className="w-8 h-8 text-white" />
            </button>
            <span className="text-[13px] text-white font-medium">{reel.comments.length}</span>
          </div>

          <button className="p-2 transition-transform active:scale-75">
            <Send className="w-7 h-7 text-white" />
          </button>

          <button className="p-2 transition-transform active:scale-75">
            <MoreVertical className="w-7 h-7 text-white" />
          </button>

          <div className="w-8 h-8 rounded-lg border-2 border-white/20 overflow-hidden animate-spin-slow">
            <img src={reel.author?.profilePicture} className="w-full h-full object-cover" alt="author" />
          </div>
        </div>

        <ReelsCommentDrawer open={openComments} setOpen={setOpenComments} reel={reel} targetCommentId={targetCommentId} />
      </div>
    </div>
  );
};

export default ReelItem;
