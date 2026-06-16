import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { useDispatch, useSelector } from "react-redux";
import { FaRegCircleUser } from "react-icons/fa6";
import Comment from "./Comment";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost, setTargetCommentId } from "@/redux/postSlice";
import { API_BASE_URL } from "@/main";
import PropTypes from "prop-types";
const CommentDialog = ({ open, setOpen }) => {
  const [text, setText] = useState("");
  const { selectedPost, posts } = useSelector((store) => store.post);
  const [comment, setComment] = useState([]);
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
        console.log('Using selectedPost comments:', selectedPost.comments);
        setComment(selectedPost.comments || []);
      }
    }
  }, [selectedPost, open, posts, dispatch]);
  const changeEventHandler = (e) => {
    const inputText = e.target.value;
    if (inputText.trim()) {
      setText(inputText);
    } else {
      setText("");
    }
  };
  const sendMessageHandler = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/post/${selectedPost._id}/comment`,
        { text },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
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
    } catch (error) {
      console.log(error);
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
        className="max-w-5xl p-0 flex flex-col border-[#262626] bg-[#121212] overflow-hidden rounded-xl shadow-2xl h-[80vh]"
      >
        <div className="flex flex-1 h-full">
          <div className="hidden md:flex w-3/5 bg-black items-center justify-center border-r border-[#262626]">
            <img
              src={selectedPost?.image}
              alt="post_image"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="w-full md:w-2/5 flex flex-col bg-[#121212]">
            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
              <div className="flex gap-3 items-center">
                <Link to={`/profile/${selectedPost?.author?._id}`}>
                  <Avatar className="w-8 h-8 border border-[#262626]">
                    <AvatarImage
                      src={selectedPost?.author?.profilePicture}
                      alt="author"
                    />
                    <AvatarFallback className="bg-[#262626]">CN</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex flex-col">
                  <Link to={`/profile/${selectedPost?.author?._id}`} className="font-bold text-xs text-white hover:text-gray-400">
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
                  <MoreHorizontal className="cursor-pointer text-gray-400 hover:text-white" size={18} />
                </DialogTrigger>
                <DialogContent className="flex flex-col text-sm text-center bg-[#121212] border-[#262626] p-0 overflow-hidden max-w-[400px]">
                  <Button variant="ghost" className="w-full text-[#ED4956] font-bold py-4 border-b border-[#262626] rounded-none hover:bg-[#1a1a1a]">Unfollow</Button>
                  <Button variant="ghost" className="w-full text-white py-4 rounded-none hover:bg-[#1a1a1a]">Add to favorites</Button>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              {/* Post Caption as first comment */}
              {selectedPost?.caption && (
                <div className="flex gap-3 mb-6">
                   <Avatar className="w-8 h-8 border border-[#262626]">
                    <AvatarImage src={selectedPost?.author?.profilePicture} />
                    <AvatarFallback className="bg-[#262626]">CN</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-white">
                      <span className="font-bold mr-2">{selectedPost?.author?.username}</span>
                      {selectedPost?.caption}
                    </p>
                    <span className="text-[10px] text-gray-500">1d</span>
                  </div>
                </div>
              )}

              {comment.map((c) => (
                <Comment key={c._id} comment={c} />
              ))}
            </div>

            <div className="p-4 border-t border-[#262626]">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  onChange={changeEventHandler}
                  value={text}
                  placeholder="Add a comment..."
                  className="w-full outline-none bg-transparent text-sm text-white placeholder:text-gray-600 focus:placeholder:text-gray-500"
                />
                <Button
                  disabled={!text.trim()}
                  onClick={sendMessageHandler}
                  className="bg-transparent hover:bg-transparent text-[#0095F6] hover:text-[#1877F2] font-bold text-sm h-auto p-0"
                >
                  Post
                </Button>
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
