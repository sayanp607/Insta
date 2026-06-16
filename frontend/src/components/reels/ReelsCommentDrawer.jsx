import React, { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Link } from "react-router-dom";
import { X, Heart, MessageCircle, Send, MoreHorizontal, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { API_BASE_URL } from "@/main";
import { toast } from "sonner";
import { setPosts, setSelectedPost } from "@/redux/postSlice";

const CommentItem = ({ comment, user, onLike, onReply, onTranslate, depth = 0, forceExpand = false, targetCommentId }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const isLiked = comment.likes?.includes(user?._id);
  const itemRef = useRef(null);
  const isTarget = comment._id === targetCommentId;

  // Function to check if target exists in this branch
  const hasTargetInChildren = (c) => {
    if (c._id === targetCommentId) return true;
    return c.children?.some(child => hasTargetInChildren(child));
  };

  // Sync showReplies with forceExpand or if target is in children
  useEffect(() => {
    if (forceExpand || (targetCommentId && hasTargetInChildren(comment))) {
      setShowReplies(true);
    }
  }, [forceExpand, targetCommentId, comment]);

  // Scroll to target comment
  useEffect(() => {
    if (isTarget && itemRef.current) {
      setTimeout(() => {
        itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [isTarget]);

  const countTotalReplies = (c) => {
    let count = c.children?.length || 0;
    c.children?.forEach(child => {
      count += countTotalReplies(child);
    });
    return count;
  };

  const totalReplies = countTotalReplies(comment);

  const handleTranslate = async () => {
    if (translatedText) {
      setTranslatedText(null);
      return;
    }
    setIsTranslating(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/v1/post/comment/translate`, { text: comment.text }, { withCredentials: true });
      if (res.data.success) {
        setTranslatedText(res.data.translatedText);
      }
    } catch (error) {
      toast.error("Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  const indentClass = depth === 0 ? "mt-6" : "mt-4";

  const getButtonText = () => {
    if (showReplies && !forceExpand) return "Hide replies";
    if (depth >= 1) return "View all replies";
    return `View ${totalReplies} ${totalReplies === 1 ? 'reply' : 'replies'}`;
  };

  return (
    <div ref={itemRef} className={`flex flex-col ${indentClass} ${isTarget ? "bg-white/10 -mx-4 px-4 py-2 rounded-lg" : ""}`}>
      <div className="flex gap-3 group">
        <Link to={`/profile/${comment.author?._id}`}>
          <Avatar className={`${depth > 0 ? "w-6 h-6" : "w-9 h-9"} border border-white/10`}>
            <AvatarImage src={comment.author?.profilePicture} />
            <AvatarFallback>{comment.author?.username?.[0] || "U"}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Link to={`/profile/${comment.author?._id}`} className="text-white font-bold text-sm hover:opacity-70 transition-opacity">
              {comment.author?.username || "Unknown User"}
            </Link>
            <span className="text-white/40 text-[10px]">1d</span>
          </div>
          <p className="text-white/90 text-[13px] leading-relaxed">
            {translatedText ? (
              <>
                <span className="italic text-white/60 text-xs block mb-1">Translated:</span>
                {translatedText}
              </>
            ) : comment.text}
          </p>
          <div className="flex items-center gap-4 text-[11px] font-bold text-white/50 pt-1">
            <button onClick={() => onReply(comment)} className="hover:text-white transition-colors">Reply</button>
            <button onClick={handleTranslate} className="hover:text-white transition-colors flex items-center gap-1">
              {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : translatedText ? "Show original" : "See translation"}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 pt-1">
          <button onClick={() => onLike(comment._id, isLiked)} className="hover:scale-110 transition-transform active:scale-90">
            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-red-500 text-red-500" : "text-white/40"}`} />
          </button>
          <span className="text-[10px] text-white/30">{comment.likes?.length || 0}</span>
        </div>
      </div>

      {comment.children?.length > 0 && (
        <div className={`${depth === 0 ? "ml-10" : (depth === 1 ? "ml-8" : "ml-0")} mt-2`}>
          {(!forceExpand || depth === 0) && (
            <button 
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-2 text-white/40 text-[11px] font-bold hover:text-white/60 transition-colors"
            >
              <div className="w-6 h-[1px] bg-white/20" />
              {getButtonText()}
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          
          <AnimatePresence>
            {showReplies && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {comment.children.map((child) => (
                  <CommentItem 
                    key={child._id} 
                    comment={child} 
                    user={user} 
                    onLike={onLike} 
                    onReply={onReply} 
                    depth={depth + 1}
                    forceExpand={showReplies && depth >= 1}
                    targetCommentId={targetCommentId}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const ReelsCommentDrawer = ({ open, setOpen, reel, targetCommentId }) => {
  const [text, setText] = useState("");
  const [commentTree, setCommentTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const scrollRef = useRef(null);

  const fetchComments = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API_BASE_URL}/api/v1/post/${reel._id}/comments`, { withCredentials: true });
      if (res.data.success) {
        buildTree(res.data.comments);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setFetching(false);
    }
  };

  const buildTree = (flatList) => {
    const map = {};
    const roots = [];

    flatList.forEach(item => {
      map[item._id] = { ...item, children: [] };
    });

    const childIds = new Set();
    flatList.forEach(item => {
      if (item.replies) {
        item.replies.forEach(childId => {
          const cid = childId.toString();
          childIds.add(cid);
          if (map[item._id] && map[cid]) {
            map[item._id].children.push(map[cid]);
          }
        });
      }
    });

    flatList.forEach(item => {
      if (!childIds.has(item._id.toString())) {
        roots.push(map[item._id]);
      }
    });

    setCommentTree(roots);
  };

  useEffect(() => {
    if (open) {
      fetchComments();
      const reelsContainer = document.querySelector('.snap-y');
      if (reelsContainer) reelsContainer.style.overflowY = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      const reelsContainer = document.querySelector('.snap-y');
      if (reelsContainer) reelsContainer.style.overflowY = 'scroll';
      document.body.style.overflow = 'unset';
    }
    return () => {
      const reelsContainer = document.querySelector('.snap-y');
      if (reelsContainer) reelsContainer.style.overflowY = 'scroll';
      document.body.style.overflow = 'unset';
    };
  }, [open, reel._id]);

  const handlePostComment = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      const url = replyingTo 
        ? `${API_BASE_URL}/api/v1/post/comment/${replyingTo._id}/reply`
        : `${API_BASE_URL}/api/v1/post/${reel._id}/comment`;
      
      const res = await axios.post(url, { text }, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success("Comment posted");
        setText("");
        setReplyingTo(null);
        fetchComments();
      }
    } catch (error) {
      toast.error("Failed to post");
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId, isLiked) => {
    try {
      const action = isLiked ? "dislike" : "like";
      const res = await axios.get(`${API_BASE_URL}/api/v1/post/comment/${commentId}/${action}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        fetchComments();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startReply = (comment) => {
    setReplyingTo(comment);
    const username = comment.author?.username || "user";
    setText(`@${username} `);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-[60]" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) {
                setOpen(false);
              }
            }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[60vh] bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 z-[70] rounded-t-[20px] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-4 pb-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-white font-bold text-center flex-1">Comments</h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {fetching ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white/20" />
                </div>
              ) : commentTree.length > 0 ? (
                commentTree.map((comment) => (
                  <CommentItem 
                    key={comment._id} 
                    comment={comment} 
                    user={user} 
                    onLike={handleLikeComment} 
                    onReply={startReply} 
                    targetCommentId={targetCommentId}
                  />
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/30 gap-2">
                  <MessageCircle className="w-12 h-12 stroke-[1]" />
                  <p className="text-sm">No comments yet</p>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            <div className="p-4 bg-[#1a1a1a] border-t border-white/5 pb-8">
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-t-xl mb-[-10px] pb-4">
                  <p className="text-[11px] text-white/50">Replying to {replyingTo.author?.username || "User"}</p>
                  <button onClick={() => { setReplyingTo(null); setText(""); }} className="text-white/50 hover:text-white"><X size={12}/></button>
                </div>
              )}
              <div className="flex items-center gap-3 bg-[#262626] rounded-full px-4 py-2 relative z-10">
                <Avatar className="w-8 h-8 border border-white/10">
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                </Avatar>
                <input 
                  type="text" 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent text-white text-[13px] outline-none placeholder:text-white/30"
                />
                <button 
                  onClick={handlePostComment}
                  disabled={!text.trim() || loading}
                  className="text-[#0095F6] font-bold text-sm disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReelsCommentDrawer;
