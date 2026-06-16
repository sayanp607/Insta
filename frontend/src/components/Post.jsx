import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { MoreHorizontal, Heart, MessageCircle, Send, Bookmark, Music, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { FaHeart } from "react-icons/fa";
import CommentDialog from "./CommentDialog";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost, setIsGlobalMuted } from "@/redux/postSlice";
import { Link } from "react-router-dom";
import SendDialog from "./SendDialog";
import { API_BASE_URL } from "@/main";
import PropTypes from "prop-types";
import { motion } from "framer-motion";

const Post = ({ post }) => {
  const [commentText, setCommentText] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [open, setOpen] = useState(false);
  const [opensend, setOpensend] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const { posts, selectedPost, isGlobalMuted } = useSelector((store) => store.post);
  const [isLiked, setIsLiked] = useState(post.likes?.includes(user?._id) || false);
  const [postLikes, setPostLikes] = useState(post.likes?.length || 0);
  const [comments, setComments] = useState(post.comments || []);
  const audioRef = useRef(null);
  const dispatch = useDispatch();

  const [isInView, setIsInView] = useState(false);
  const postRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        // Auto-pause if it leaves view
        if (!entry.isIntersecting && audioRef.current) {
          audioRef.current.pause();
        }
      },
      { threshold: 0.5 } // 50% of the post must be visible
    );

    if (postRef.current) {
      observer.observe(postRef.current);
    }

    // Auto-open comment dialog if this post is selected from notification
    if (selectedPost?._id === post._id) {
        setOpen(true);
        // Small delay to ensure rendering is complete before scrolling
        setTimeout(() => {
            postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }

    return () => {
      if (postRef.current) observer.unobserve(postRef.current);
    };
  }, [selectedPost?._id, post._id]);

  useEffect(() => {
    if (audioRef.current && post.song) {
      if (!isGlobalMuted && isInView) {
        audioRef.current.currentTime = post.songStart || 0;
        audioRef.current.play().catch(e => console.log("Autoplay blocked"));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isGlobalMuted, isInView, post.song, post.songStart]);

  const changeEventHandler = (e) => {
    setCommentText(e.target.value);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    dispatch(setIsGlobalMuted(!isGlobalMuted));
  };

  const likeOrdislikehandler = async () => {
    try {
      const action = isLiked ? "dislike" : "like";
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/post/${post._id}/${action}`,
        { withCredentials: true }
      );
      if (res.data.success) {
        const updatedLikes = isLiked ? postLikes - 1 : postLikes + 1;
        setPostLikes(updatedLikes);
        setIsLiked(!isLiked);
        const updatedPostData = posts.map((p) =>
          p._id === post._id
            ? {
                ...p,
                likes: isLiked
                  ? p.likes.filter((id) => id !== user._id)
                  : [...p.likes, user._id],
              }
            : p
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deletePostHandler = async () => {
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/v1/post/delete/${post?._id}`,
        { withCredentials: true }
      );
      if (res.data.success) {
        const updatedData = posts.filter(
          (postItem) => postItem?._id !== post?._id
        );
        dispatch(setPosts(updatedData));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to delete post");
    }
  };

  const commentHandler = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/post/${post._id}/comment`,
        { text: commentText },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        const updatedData = [...comments, res.data.comment];
        setComments(updatedData);

        const updatedPostData = posts.map((p) =>
          p._id === post._id ? { ...p, comments: updatedData } : p
        );
        dispatch(setPosts(updatedPostData));

        if (selectedPost?._id === post._id) {
          dispatch(setSelectedPost({ ...selectedPost, comments: updatedData }));
        }

        toast.success(res.data.message);
        setCommentText("");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const bookmarkHandler = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/post/${post?._id}/bookmark`,
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        setIsBookmarked((prev) => !prev);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div ref={postRef} className="my-8 w-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
      <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden shadow-2xl transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
        {/* Post Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.author?._id}`}>
              <Avatar className="w-10 h-10 border border-[#262626] hover:scale-105 transition-transform duration-200">
                <AvatarImage src={post.author?.profilePicture} alt="post_image" />
                <AvatarFallback className="bg-[#262626]">CN</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Link to={`/profile/${post.author?._id}`} className="font-bold text-sm text-white hover:text-gray-400 transition-colors">
                  {post.author?.username}
                </Link>
                <div className="w-1 h-1 bg-gray-500 rounded-full" />
                <span className="text-gray-500 text-xs">1d</span>
              </div>
              {post.song && (
                <div className="flex items-center gap-2 mt-1 px-2 py-0.5 bg-[#0095F6]/10 rounded-full w-fit border border-[#0095F6]/20">
                  {post.song.thumbnail && (
                     <img src={post.song.thumbnail} alt="album" className="w-3.5 h-3.5 rounded-sm object-cover" />
                  )}
                  <Music className="w-3 h-3 text-[#0095F6]" />
                  <span className="text-[10px] font-bold text-[#0095F6] truncate max-w-[120px]">
                    {post.song.title} • {post.song.artist}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <MoreHorizontal className="cursor-pointer text-gray-400 hover:text-white transition-colors" />
            </DialogTrigger>
            <DialogContent className="flex flex-col items-center text-sm text-center bg-[#121212] border-[#262626] text-white p-0 overflow-hidden max-w-[400px]">
              {post.author?._id !== user?._id && (
                 <Button variant="ghost" className="w-full text-[#ED4956] font-bold py-4 border-b border-[#262626] rounded-none hover:bg-[#1a1a1a]">
                   Unfollow
                 </Button>
              )}
              <Button onClick={bookmarkHandler} variant="ghost" className="w-full py-4 border-b border-[#262626] rounded-none hover:bg-[#1a1a1a]">
                Add to favorites
              </Button>
              {user && user?._id === post.author?._id && (
                <Button onClick={deletePostHandler} variant="ghost" className="w-full py-4 border-b border-[#262626] rounded-none hover:bg-[#1a1a1a] text-[#ED4956]">
                  Delete
                </Button>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Post Image with Playback controls */}
        <div className="relative group aspect-square overflow-hidden bg-black flex items-center justify-center">
          {post.mediaType === "video" ? (
            <video
              src={post.image}
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={post.image}
              alt="post_img"
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
            />
          )}
          
          {post.song && (
            <>
              <audio 
                ref={audioRef} 
                src={post.song.url} 
                loop 
                onTimeUpdate={(e) => {
                  if (e.target.currentTime >= (post.songStart || 0) + 30) {
                    e.target.currentTime = post.songStart || 0;
                  }
                }}
              />
              <button 
                onClick={toggleMute}
                className="absolute bottom-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isGlobalMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="text-[#0095F6]" />}
              </button>

              {!isGlobalMuted && (
                <div className="absolute top-4 right-4 flex gap-0.5 items-end h-4">
                  {[1, 2, 3, 4].map(i => (
                    <div 
                      key={i} 
                      className="w-1 bg-[#0095F6] animate-music-bar"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Post Actions */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              {isLiked ? (
                <motion.div whileTap={{ scale: 0.8 }} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                  <FaHeart
                    onClick={likeOrdislikehandler}
                    size={"24"}
                    className="cursor-pointer text-[#FF3040]"
                  />
                </motion.div>
              ) : (
                <motion.div whileTap={{ scale: 0.8 }}>
                  <Heart
                    onClick={likeOrdislikehandler}
                    size={"24"}
                    className="cursor-pointer text-white hover:text-gray-400 transition-colors"
                  />
                </motion.div>
              )}
              <MessageCircle
                onClick={() => {
                  dispatch(setSelectedPost(post));
                  setOpen(true);
                }}
                size={"24"}
                className="cursor-pointer text-white hover:text-gray-400 hover:scale-110 transition-transform"
              />
              <Send size={"24"} className="cursor-pointer text-white hover:text-gray-400 hover:scale-110 transition-transform" onClick={() => setOpensend(true)} />
              <SendDialog open={opensend} setOpen={setOpensend} />
            </div>
            <Bookmark
              onClick={bookmarkHandler}
              size={"24"}
              className={`cursor-pointer ${isBookmarked ? 'text-white fill-current' : 'text-gray-400'} hover:text-white hover:scale-110 transition-transform`}
            />
          </div>

          <span className="font-bold text-sm block mb-2 text-white">{postLikes} likes</span>

          <div className="text-sm">
            <Link to={`/profile/${post.author?._id}`} className="font-bold mr-2 text-white hover:underline">
              {post.author?.username || "user"}
            </Link>
            <span className="text-gray-300">{post.caption}</span>
          </div>

          {comments.length > 0 && (
            <span
              onClick={() => {
                dispatch(setSelectedPost(post));
                setOpen(true);
              }}
              className="mt-2 block cursor-pointer text-gray-500 text-sm hover:text-gray-400 transition-colors"
            >
              View all {comments.length} comments
            </span>
          )}
        </div>

        {/* Comment Input */}
        <div className="px-3 pb-3 border-t border-[#262626] pt-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={commentText}
            onChange={changeEventHandler}
            className="outline-none text-sm w-full bg-transparent text-white placeholder:text-gray-600 focus:placeholder:text-gray-500"
          />
          {commentText && (
            <span
              onClick={commentHandler}
              className="text-[#0095F6] font-bold text-sm cursor-pointer hover:text-[#1877F2] transition-colors"
            >
              Post
            </span>
          )}
        </div>
      </div>

      <CommentDialog open={open} setOpen={setOpen} />
    </div>
  );
};

Post.propTypes = {
  post: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    author: PropTypes.shape({
      _id: PropTypes.string,
      username: PropTypes.string,
      profilePicture: PropTypes.string,
    }),
    image: PropTypes.string,
    caption: PropTypes.string,
    likes: PropTypes.arrayOf(PropTypes.string),
    comments: PropTypes.array,
    song: PropTypes.shape({
      title: PropTypes.string,
      artist: PropTypes.string,
      url: PropTypes.string,
      thumbnail: PropTypes.string,
    }),
    songStart: PropTypes.number,
  }).isRequired,
};

export default Post;
