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
        <div className="max-h-[450px] overflow-y-auto px-4 pb-4 custom-scrollbar">
          {filteredUsers?.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm">No users found</p>
            </div>
          ) : (
            filteredUsers?.map((user) => {
              const userId = typeof user === "object" && user._id ? user._id : user;
              const isFollowing = loggedInUser?.following?.some(
                (id) => String(id) === String(userId)
              );
              const isOwnProfile = String(loggedInUser?._id) === String(userId);

              return (
                <div
                  key={userId}
                  className="flex items-center justify-between py-4 px-3 hover:bg-gray-50/80 rounded-xl transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <Link
                      to={`/profile/${userId}`}
                      onClick={() => onOpenChange(false)}
                      className="relative shrink-0"
                    >
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                        <AvatarImage
                          src={user?.profilePicture}
                          alt={user?.username}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 font-medium">
                          {user?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex flex-col min-w-0">
                      <Link
                        to={`/profile/${userId}`}
                        onClick={() => onOpenChange(false)}
                      >
                        <span className="font-bold text-[14px] text-gray-900 truncate hover:underline block">
                          {user?.username}
                        </span>
                      </Link>
                      <span className="text-gray-500 text-[12px] truncate max-w-[180px]">
                        {user?.bio || "No bio yet"}
                      </span>
                    </div>
                  </div>

                  {!isOwnProfile && (
                    <button
                      onClick={() => followOrUnfollowHandler(userId)}
                      className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 active:scale-95 ${
                        isFollowing
                          ? "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200"
                          : "bg-[#0095F6] hover:bg-[#1877F2] text-white shadow-md shadow-blue-500/20"
                      }`}
                    >
                      {isFollowing ? "Following" : (user?.isFollower ? "Follow Back" : "Follow")}
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
