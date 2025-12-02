import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Link } from "react-router-dom";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "@/main";
import { setAuthUser } from "@/redux/authSlice";
import PropTypes from "prop-types";

const FollowersDialog = ({ open, onOpenChange, users, title }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user: loggedInUser } = useSelector((store) => store.auth);
  const dispatch = useDispatch();

  const filteredUsers = users?.filter((user) =>
    user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const followOrUnfollowHandler = async (userId) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/user/followorunfollow/${userId}`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        // Check current state before update
        const isCurrentlyFollowing = loggedInUser?.following?.some(
          (id) => String(id) === String(userId)
        );

        // Update logged-in user's following array
        const updatedUser = {
          ...loggedInUser,
          following: isCurrentlyFollowing
            ? loggedInUser.following.filter(
                (id) => String(id) !== String(userId)
              )
            : [...loggedInUser.following, userId],
        };
        dispatch(setAuthUser(updatedUser));

        toast.success(res.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-center font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="max-h-[400px] overflow-y-auto px-4 pb-4">
          {filteredUsers?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            filteredUsers?.map((user) => {
              const userId =
                typeof user === "object" && user._id ? user._id : user;
              const isFollowing = loggedInUser?.following?.some(
                (id) => String(id) === String(userId)
              );
              const isOwnProfile = String(loggedInUser?._id) === String(userId);

              return (
                <div
                  key={user._id}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/profile/${user._id}`}
                      onClick={() => onOpenChange(false)}
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage
                          src={user?.profilePicture}
                          alt={user?.username}
                        />
                        <AvatarFallback>
                          {user?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link
                        to={`/profile/${user._id}`}
                        onClick={() => onOpenChange(false)}
                      >
                        <h1 className="font-semibold text-sm hover:underline">
                          {user?.username}
                        </h1>
                      </Link>
                      <span className="text-gray-600 text-xs">
                        {user?.bio?.substring(0, 30) || "No bio"}
                        {user?.bio?.length > 30 ? "..." : ""}
                      </span>
                    </div>
                  </div>

                  {!isOwnProfile && (
                    <button
                      onClick={() => followOrUnfollowHandler(user._id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isFollowing
                          ? "bg-gray-200 hover:bg-gray-300 text-black"
                          : "bg-[#0095F6] hover:bg-[#3192d2] text-white"
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

FollowersDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  users: PropTypes.array,
  title: PropTypes.string.isRequired,
};

export default FollowersDialog;
