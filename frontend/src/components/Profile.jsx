import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import useGetUserProfile from "@/hooks/useGetUserProfile";
import { Link, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AtSign, Heart, MessageCircle, Lock } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { setUserProfile, setAuthUser } from "@/redux/authSlice";
import { API_BASE_URL } from "@/main";
import FollowersDialog from "./FollowersDialog";
import ProfilePhotoModal from "./post-upload/ProfilePhotoModal";
import useGetHighlights from "@/hooks/useGetHighlights";
import StoryViewer from "./stories/StoryViewer";
import { getSocket } from "@/socketInstance,";
import { Plus } from "lucide-react";
import CommentDialog from "./CommentDialog";
import { setSelectedPost } from "@/redux/postSlice";

const Profile = () => {
  const params = useParams();
  const userId = params.id;
  useGetUserProfile(userId);
  const [activeTab, setActiveTab] = useState("posts");
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showFollowingDialog, setShowFollowingDialog] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedHighlightIndex, setSelectedHighlightIndex] = useState(null);
  const [openPost, setOpenPost] = useState(false);
  const { highlights } = useGetHighlights(userId);
  const dispatch = useDispatch();

  const handlePostClick = (post) => {
    dispatch(setSelectedPost(post));
    setOpenPost(true);
  };

  const { userProfile, user } = useSelector((store) => store.auth);
  const socket = getSocket();

  React.useEffect(() => {
    if (socket) {
      const handleNotification = (notif) => {
        if ((notif.type === 'follow' || notif.type === 'follow_declined') && notif.sender._id === userId) {
          // Re-fetch profile data
          axios.get(`${API_BASE_URL}/api/v1/user/${userId}/profile`, { withCredentials: true })
            .then(res => {
              if (res.data.success) {
                dispatch(setUserProfile(res.data.user));
              }
            });
        }
      };
      socket.on('notification', handleNotification);
      return () => socket.off('notification', handleNotification);
    }
  }, [socket, userId, dispatch]);

  const isLoggedInUserProfile = user?._id === userProfile?._id;

  // Convert both to strings for reliable comparison
  const isFollowing = userProfile?.isFollowing;
  const isRequested = userProfile?.isRequested;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const followOrUnfollowHandler = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/user/followorunfollow/${userId}`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        // Update userProfile state locally
        const currentFollowersCount = userProfile?.followersCount ?? userProfile?.followers?.length ?? 0;
        const updatedUserProfile = {
          ...userProfile,
          isFollowing: res.data.isFollowing,
          isRequested: res.data.isRequested,
          followersCount: res.data.isFollowing ? currentFollowersCount + 1 : (isFollowing ? currentFollowersCount - 1 : currentFollowersCount)
        };
        dispatch(setUserProfile(updatedUserProfile));
        
        toast.success(res.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };
  const isRestricted = userProfile?.isPrivate && !isLoggedInUserProfile && !isFollowing;

  const handleFollowersClick = () => {
    if (isRestricted) {
      toast.error("This account is private. Follow them to see their followers.");
      return;
    }
    setShowFollowersDialog(true);
  };

  const handleFollowingClick = () => {
    if (isRestricted) {
      toast.error("This account is private. Follow them to see who they follow.");
      return;
    }
    setShowFollowingDialog(true);
  };

  const displayedPost =
    activeTab === "posts" ? userProfile?.posts : userProfile?.bookmarks;

  return (
    <div className="flex max-w-5xl justify-center mx-auto pl-10">
      <div className="flex flex-col gap-20 p-8 w-full">
        <div className="grid grid-cols-2">
          <section className="flex items-center justify-center">
            <Avatar 
              className={`h-32 w-32 ${isLoggedInUserProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              onClick={() => isLoggedInUserProfile && setShowPhotoModal(true)}
            >
              <AvatarImage
                src={userProfile?.profilePicture}
                alt="profilephoto"
              />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </section>
          <section>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{userProfile?.username}</span>
                {isLoggedInUserProfile ? (
                  <>
                    <Link to="/account/edit">
                      <Button
                        variant="secondary"
                        className="hover:bg-[#F1E8DF] bg-[#FFFFFF] text-[#1A1A1A] border border-[#EADCCA] h-8"
                      >
                        Edit profile
                      </Button>
                    </Link>
                  </>
                ) : isFollowing ? (
                  <>
                    <button
                      onClick={followOrUnfollowHandler}
                      className="bg-[#F1E8DF] hover:bg-[#EADCCA] text-[#1A1A1A] px-6 py-2 rounded-lg font-bold text-sm transition-all duration-200"
                    >
                      Following
                    </button>
                    <button className="bg-[#F1E8DF] hover:bg-[#EADCCA] text-[#1A1A1A] px-6 py-2 rounded-lg font-bold text-sm transition-all duration-200">
                      Message
                    </button>
                  </>
                ) : isRequested ? (
                  <button
                    onClick={followOrUnfollowHandler}
                    className="bg-[#F1E8DF] hover:bg-[#EADCCA] text-[#1A1A1A] px-6 py-2 rounded-lg font-bold text-sm transition-all duration-200"
                  >
                    Requested
                  </button>
                ) : (
                  <button
                    onClick={followOrUnfollowHandler}
                    className="bg-[#0095F6] hover:bg-[#1877F2] text-[#1A1A1A] px-8 py-2 rounded-lg font-bold text-sm transition-all duration-200 shadow-md shadow-blue-500/20"
                  >
                    {userProfile?.isFollower ? "Follow Back" : "Follow"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-8">
                <p>
                  <span className="font-bold">
                    {userProfile?.postsCount !== undefined ? userProfile.postsCount : userProfile?.posts?.length || 0}{" "}
                  </span>
                  posts
                </p>
                <p
                  onClick={handleFollowersClick}
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <span className="font-bold">
                    {userProfile?.followersCount !== undefined ? userProfile.followersCount : userProfile?.followers?.length || 0}{" "}
                  </span>
                  followers
                </p>
                <p
                  onClick={handleFollowingClick}
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <span className="font-bold">
                    {userProfile?.followingCount !== undefined ? userProfile.followingCount : userProfile?.following?.length || 0}{" "}
                  </span>
                  following
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[#1A1A1A]">
                  {userProfile?.bio || "No bio yet"}
                </span>
                <div className="flex items-center gap-1 text-gray-600 text-sm">
                  <AtSign size={14} /> 
                  <span>{userProfile?.username}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Highlights Section (Hidden if restricted) */}
        {!isRestricted && highlights.length > 0 && (
          <div className="flex gap-6 overflow-x-auto no-scrollbar py-4 border-t border-gray-300">
            {highlights.map((h, index) => (
              <div 
                key={h._id} 
                className="flex flex-col items-center gap-2 cursor-pointer group min-w-[80px]"
                onClick={() => setSelectedHighlightIndex(index)}
              >
                <div className="w-16 h-16 rounded-full border border-gray-300 p-[2px] group-hover:border-gray-500 transition-colors shadow-lg">
                   <div className="w-full h-full rounded-full overflow-hidden">
                      <img src={h.cover} alt={h.name} className="w-full h-full object-cover" />
                   </div>
                </div>
                <span className="text-xs text-[#1A1A1A] font-medium truncate w-full text-center">{h.name}</span>
              </div>
            ))}
          </div>
        )}

        {isRestricted ? (
          <div className="border-t border-gray-300 flex flex-col items-center justify-center py-20 bg-[#0a0a0a] rounded-b-xl">
             <div className="p-6 border-2 border-gray-300 rounded-full mb-6">
                <Lock size={48} className="text-gray-600" />
             </div>
             <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">This Account is Private</h1>
             <p className="text-gray-600 max-w-sm text-center">
                Follow this account to see their photos and videos.
             </p>
          </div>
        ) : (
          <div className="border-t border-gray-300">
            <div className="flex items-center justify-center gap-10 text-xs font-bold tracking-widest text-gray-600">
              <span
                className={`py-3 cursor-pointer flex items-center gap-1 border-t ${
                  activeTab === "posts" ? "text-[#1A1A1A] border-white" : "border-transparent"
                }`}
                onClick={() => handleTabChange("posts")}
              >
                POSTS
              </span>
              {isLoggedInUserProfile && (
                <span
                  className={`py-3 cursor-pointer flex items-center gap-1 border-t ${
                    activeTab === "saved" ? "text-[#1A1A1A] border-white" : "border-transparent"
                  }`}
                  onClick={() => handleTabChange("saved")}
                >
                  SAVED
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 md:gap-4 mt-4">
              {displayedPost?.map((post) => {
                return (
                  <div 
                    key={post?._id} 
                    className="relative aspect-square group cursor-pointer overflow-hidden rounded-sm md:rounded-md"
                    onClick={() => handlePostClick(post)}
                  >
                    <img
                      src={post.image}
                      alt="postimage"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-[#FAF6F0]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center text-[#1A1A1A] space-x-6 font-bold">
                        <div className="flex items-center gap-2">
                          <Heart className="fill-white" size={20} />
                          <span>{post?.likes.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="fill-white" size={20} />
                          <span>{post?.comments.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Followers Dialog */}
      <FollowersDialog
        open={showFollowersDialog}
        onOpenChange={setShowFollowersDialog}
        users={userProfile?.followers}
        title="Followers"
      />

      <FollowersDialog
        open={showFollowingDialog}
        onOpenChange={setShowFollowingDialog}
        users={userProfile?.following}
        title="Following"
      />

      <ProfilePhotoModal 
        open={showPhotoModal}
        onOpenChange={setShowPhotoModal}
        user={userProfile}
      />

      {selectedHighlightIndex !== null && (
        <StoryViewer 
            open={selectedHighlightIndex !== null}
            onOpenChange={() => setSelectedHighlightIndex(null)}
            storyGroups={highlights.map(h => ({ author: userProfile, stories: h.stories }))}
            initialGroupIndex={selectedHighlightIndex}
        />
      )}

      {/* Dialog for displaying clicked post */}
      <CommentDialog open={openPost} setOpen={setOpenPost} />
    </div>
  );
};

export default Profile;
