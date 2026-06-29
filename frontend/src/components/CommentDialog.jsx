import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Link } from "react-router-dom";
import { MoreHorizontal, Heart, Bookmark, MessageCircle, Send } from "lucide-react";
import { Button } from "./ui/button";
import { useDispatch, useSelector } from "react-redux";
import { FaRegCircleUser } from "react-icons/fa6";
import { FaHeart } from "react-icons/fa";
import Comment from "./Comment";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost, setTargetCommentId } from "@/redux/postSlice";
import { setAuthUser, setUserProfile } from "@/redux/authSlice";
import { API_BASE_URL } from "@/main";
import PropTypes from "prop-types";
const CommentDialog = ({ open, setOpen }) => {
  const [text, setText] = useState("");
  const { selectedPost, posts, targetCommentId } = useSelector((store) => store.post);
  const { user, userProfile } = useSelector((store) => store.auth);
  const [comment, setComment] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const dispatch = useDispatch();
  
  useEffect(() => {
    if (selectedPost && open) {
      // Find the updated post from posts array if available
      const updatedPost = posts.find(p => p._id === selectedPost._id);
      if (updatedPost) {
        console.log('Syncing comments from posts array:', updatedPost.comments);
        setComment(updatedPost.comments || []);
        // Update selectedPost with latest data
        dispatch(setSelectedPost(updatedPost));
      } else {
        setComment(selectedPost.comments || []);
      }
      setIsLiked(selectedPost?.likes?.includes(user?._id) || false);
      setIsBookmarked(user?.bookmarks?.includes(selectedPost?._id) || false);
    }
  }, [selectedPost, open, posts, dispatch, user]);
  const changeEventHandler = (e) => {
    const inputText = e.target.value;
    if (inputText.trim()) {
      setText(inputText);
    } else {
      setText("");
    }
  };

  const likeOrdislikehandler = async () => {
    if (!selectedPost) return;
    try {
      const action = isLiked ? "dislike" : "like";
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/post/${selectedPost._id}/${action}`,
        { withCredentials: true }
      );
      if (res.data.success) {
        setIsLiked(!isLiked);
        
        const updatedLikes = isLiked
            ? selectedPost.likes.filter((id) => id !== user._id)
            : [...selectedPost.likes, user._id];
            
        const updatedSelectedPost = { ...selectedPost, likes: updatedLikes };
        dispatch(setSelectedPost(updatedSelectedPost));

        const updatedPostData = posts.map((p) =>
          p._id === selectedPost._id ? updatedSelectedPost : p
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const bookmarkHandler = async () => {
    if (!selectedPost) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/post/${selectedPost._id}/bookmark`,
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        setIsBookmarked((prev) => !prev);
        
        const updatedBookmarks = isBookmarked
          ? user.bookmarks.filter(id => id !== selectedPost._id)
          : [...(user.bookmarks || []), selectedPost._id];
          
        dispatch(setAuthUser({ ...user, bookmarks: updatedBookmarks }));

        // Update userProfile so UI updates in real-time on Profile page
        if (userProfile && userProfile._id === user._id) {
          const updatedProfileBookmarks = isBookmarked
            ? userProfile.bookmarks.filter(p => p._id !== selectedPost._id)
            : [...(userProfile.bookmarks || []), selectedPost];
            
          dispatch(setUserProfile({ ...userProfile, bookmarks: updatedProfileBookmarks }));
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const sendMessageHandler = async () => {
    if (!text.trim() || isPosting) return;
    setIsPosting(true);
    
    try {
      const isReply = !!targetCommentId;
      const url = isReply
        ? `${API_BASE_URL}/api/v1/post/comment/${targetCommentId}/reply`
        : `${API_BASE_URL}/api/v1/post/${selectedPost?._id}/comment`;

      const res = await axios.post(
        url,
        { text },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        if (isReply) {
           // We just refetch the post to get the updated comments with replies
           // rather than manually nesting it in Redux (which is complex).
           // This keeps state management clean.
           toast.success("Reply added!");
           setText("");
           dispatch(setTargetCommentId(null));
        } else {
           const updatedCommentData = [...comment, res.data.comment];
           setComment(updatedCommentData);

           const updatedPostData = posts.map((p) =>
             p._id === selectedPost._id
               ? { ...p, comments: updatedCommentData }
               : p
           );
           dispatch(setPosts(updatedPostData));

           // Update selectedPost as well so it stays in sync
           dispatch(
             setSelectedPost({ ...selectedPost, comments: updatedCommentData })
           );

           toast.success(res.data.message);
           setText("");
        }
      }
    } catch (error) {
      console.log(error);
      const errorMessage = error.response?.data?.message || "Failed to send message";
      toast.error(errorMessage);
    } finally {
      setIsPosting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            dispatch(setSelectedPost(null));
            dispatch(setTargetCommentId(null));
        }
    }}>
      <DialogContent
        onInteractOutside={() => setOpen(false)}
        className="max-w-5xl p-0 flex flex-col border-gray-300 bg-[#FAF6F0] overflow-hidden rounded-xl shadow-2xl h-[80vh]"
      >
        <div className="flex flex-1 h-full">
          <div className="hidden md:flex w-3/5 bg-[#FAF6F0] items-center justify-center border-r border-gray-300">
            <img
              src={selectedPost?.image}
              alt="post_image"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="w-full md:w-2/5 flex flex-col bg-[#FAF6F0]">
            <div className="flex items-center justify-between p-4 border-b border-gray-300">
              <div className="flex gap-3 items-center">
                <Link to={`/profile/${selectedPost?.author?._id}`}>
                  <Avatar className="w-8 h-8 border border-gray-300">
                    <AvatarImage
                      src={selectedPost?.author?.profilePicture}
                      alt="author"
                    />
                    <AvatarFallback className="bg-[#F1E8DF]">CN</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex flex-col">
                  <Link to={`/profile/${selectedPost?.author?._id}`} className="font-bold text-xs text-[#1A1A1A] hover:text-gray-600">
                    {selectedPost?.author?.username}
                  </Link>
                  {selectedPost?.song && (
                    <span className="text-[10px] text-[#0095F6] animate-pulse">
                      {selectedPost.song.title}
                    </span>
                  )}
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <MoreHorizontal className="cursor-pointer text-gray-600 hover:text-[#1A1A1A]" size={18} />
                </DialogTrigger>
                <DialogContent className="flex flex-col text-sm text-center bg-[#FAF6F0] border-gray-300 p-0 overflow-hidden max-w-[400px]">
                  <Button variant="ghost" className="w-full text-[#ED4956] font-bold py-4 border-b border-gray-300 rounded-none hover:bg-[#FFFFFF]">Unfollow</Button>
                  <Button variant="ghost" className="w-full text-[#1A1A1A] py-4 rounded-none hover:bg-[#FFFFFF]">Add to favorites</Button>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              {/* Post Caption as first comment */}
              {selectedPost?.caption && (
                <div className="flex gap-3 mb-6">
                   <Avatar className="w-8 h-8 border border-gray-300">
                    <AvatarImage src={selectedPost?.author?.profilePicture} />
                    <AvatarFallback className="bg-[#F1E8DF]">CN</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-[#1A1A1A]">
                      <span className="font-bold mr-2">{selectedPost?.author?.username}</span>
                      {selectedPost?.caption}
                    </p>
                    <span className="text-[10px] text-gray-600">1d</span>
                  </div>
                </div>
              )}
              {comment.map((c) => (
                <Comment key={c._id} comment={c} />
              ))}
            </div>
            
            {/* Action Bar (Like, Comment, Share, Bookmark) */}
            <div className="p-4 border-t border-gray-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  {isLiked ? (
                    <FaHeart onClick={likeOrdislikehandler} size={"24"} className="cursor-pointer text-[#FF3040]" />
                  ) : (
                    <Heart onClick={likeOrdislikehandler} size={"24"} className="cursor-pointer text-[#1A1A1A] hover:text-gray-600" />
                  )}
                  <MessageCircle size={"24"} className="cursor-pointer text-[#1A1A1A] hover:text-gray-600" />
                  <Send size={"24"} className="cursor-pointer text-[#1A1A1A] hover:text-gray-600" />
                </div>
                <Bookmark 
                  onClick={bookmarkHandler} 
                  size={"24"} 
                  className={`cursor-pointer ${isBookmarked ? 'text-[#1A1A1A] fill-current' : 'text-gray-600'} hover:text-[#1A1A1A]`} 
                />
              </div>
              <span className="font-bold text-sm block mb-2 text-[#1A1A1A]">{selectedPost?.likes?.length || 0} likes</span>
              
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  onChange={changeEventHandler}
                  value={text}
                  placeholder="Add a comment..."
                  className="w-full outline-none bg-transparent text-sm text-[#1A1A1A] placeholder:text-gray-800 focus:placeholder:text-gray-600"
                />
                <div className="flex items-center min-w-[90px] justify-end">
                  {isPosting ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse font-bold text-sm whitespace-nowrap">
                      AI Processing...
                    </span>
                  ) : (
                    <Button
                      disabled={!text.trim()}
                      onClick={sendMessageHandler}
                      className="bg-transparent hover:bg-transparent text-[#0095F6] hover:text-[#1877F2] font-bold text-sm h-auto p-0"
                    >
                      Post
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

CommentDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
};

export default CommentDialog;
