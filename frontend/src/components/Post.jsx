import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { Button } from "./ui/button";
import { FaRegHeart } from "react-icons/fa";
import { FaHeart } from "react-icons/fa";
import CommentDialog from "./CommentDialog";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { FaRegCircleUser } from "react-icons/fa6";
import { Badge } from "./ui/badge";
import { FaRegBookmark, FaBookmark } from "react-icons/fa6";
import { Link } from "react-router-dom";
import SendDialog from "./SendDialog";
import { API_BASE_URL } from "@/main";
import PropTypes from "prop-types";
const Post = ({ post }) => {
  const [text, setText] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [open, setOpen] = useState(false);
  const [opensend, setOpensend] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const { posts, selectedPost } = useSelector((store) => store.post);
  const [liked, setLiked] = useState(post.likes.includes(user?._id) || false);
  const [postLike, setPostLike] = useState(post.likes.length);
  const [comment, setComment] = useState(post.comments);
  const dispatch = useDispatch();
  const changeEventHandler = (e) => {
    const inputText = e.target.value;
    if (inputText.trim()) {
      setText(inputText);
    } else {
      setText("");
    }
  };

  const likeOrdislikehandler = async () => {
    try {
      const action = liked ? "dislike" : "like";
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/post/${post._id}/${action}`,
        { withCredentials: true }
      );
      if (res.data.success) {
        const updatedLikes = liked ? postLike - 1 : postLike + 1;
        setPostLike(updatedLikes);
        setLiked(!liked);
        const updatedPostData = posts.map((p) =>
          p._id === post._id
            ? {
                ...p,
                likes: liked
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
      toast.error(error.response.data.message);
    }
  };
  const commentHandler = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/post/${post._id}/comment`,
        { text },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        const updatedData = [...comment, res.data.comment];
        setComment(updatedData);

        const updatedPostData = posts.map((p) =>
          p._id === post._id ? { ...p, comments: updatedData } : p
        );
        dispatch(setPosts(updatedPostData));

        // Update selectedPost if this post is currently selected
        if (selectedPost?._id === post._id) {
          dispatch(setSelectedPost({ ...selectedPost, comments: updatedData }));
        }

        toast.success(res.data.message);
        setText("");
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
        setBookmarked((prev) => !prev);
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="my -8 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 ">
          <Link to={`/profile/${post.author?._id || "#"}`}>
            <Avatar className="w-6 h-6">
              <AvatarImage src={post.author?.profilePicture} alt="@shadcn" />
              <AvatarFallback>
                <FaRegCircleUser />
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.author?._id || "#"}`}>
              <h1>{post.author?.username || "Deleted User"}</h1>
            </Link>
            {user?._id === post.author?._id && (
              <Badge variant="secondary">Author</Badge>
            )}
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <MoreHorizontal className="cursor-pointer" />
          </DialogTrigger>
          <DialogContent className="flex flex-col items-center text-sm text-center">
            {post?.author?._id !== user?._id && (
              <Button
                variant="ghost"
                className="cursor-pointer w-fit text-[#ED4956] font-bold"
              >
                Unfollow
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={bookmarkHandler}
              className="cursor-pointer w-fit "
            >
              Add to favourites
            </Button>
            {user && user?._id === post?.author?._id && (
              <Button
                onClick={deletePostHandler}
                variant="ghost"
                className="cursor-pointer w-fit"
              >
                Delete
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <img
        className="rounded-sm my-2 w-full aspect-square object-cover"
        src={post.image}
        alt=""
      />
      <div className="flex items-center justify-between my-2">
        <div className="flex items-center gap-3">
          {liked ? (
            <FaHeart
              onClick={likeOrdislikehandler}
              size={"24"}
              className="cursor-pointer text-red-600"
            />
          ) : (
            <FaRegHeart
              onClick={likeOrdislikehandler}
              size={"22px"}
              className="cursor-pointer hover:text-gray-600"
            />
          )}
          <MessageCircle
            onClick={() => {
              // Find the latest version of this post from Redux store
              const latestPost = posts.find((p) => p._id === post._id) || post;
              console.log("Opening comment dialog for post:", latestPost._id);
              console.log(
                "Comments in post:",
                latestPost.comments?.length || 0
              );
              dispatch(setSelectedPost(latestPost));
              setOpen(true);
            }}
            className="cursor-pointer hover:text-gray-600"
          />
          <Send
            className="cursor-pointer hover:text-gray-600"
            onClick={() => {
              setOpensend(true);
            }}
          />
          <SendDialog open={opensend} setOpen={setOpensend} />
        </div>
        {bookmarked ? (
          <FaBookmark
            size="25px"
            onClick={bookmarkHandler}
            className="cursor-pointer hover:text-gray-600"
          />
        ) : (
          <FaRegBookmark
            size="25px"
            onClick={bookmarkHandler}
            className="cursor-pointer hover:text-gray-600"
          />
        )}
      </div>
      <span className="font-medium block mb-2">{postLike} likes</span>
      <p>
        <span className="font-medium mr-2 ">
          {post.author?.username || "Deleted User"}
        </span>
        {post.caption}
      </p>
      {comment.length > 0 && (
        <span
          onClick={() => {
            // Find the latest version of this post from Redux store
            const latestPost = posts.find((p) => p._id === post._id) || post;
            console.log(
              'Opening comment dialog from "View all":',
              latestPost._id
            );
            console.log("Comments in post:", latestPost.comments?.length || 0);
            dispatch(setSelectedPost(latestPost));
            setOpen(true);
          }}
          className="cursor-pointer text-sm text-gray-300"
        >
          View all {comment.length} comments
        </span>
      )}

      <CommentDialog open={open} setOpen={setOpen} />
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Add a comment..."
          value={text}
          onChange={changeEventHandler}
          className="outline-none text-sm w-full"
        />
        {text && (
          <span
            onClick={commentHandler}
            className="text-[#3BADF8] cursor-pointer"
          >
            Post
          </span>
        )}
      </div>
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
  }).isRequired,
};

export default Post;
