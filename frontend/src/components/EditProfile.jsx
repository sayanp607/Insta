import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { FaRegCircleUser } from "react-icons/fa6";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Loader2, Lock, Globe, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { setAuthUser } from "@/redux/authSlice";
import { toast } from "sonner";
import axios from "axios";
import { API_BASE_URL } from "@/main";
import ProfilePhotoModal from "./post-upload/ProfilePhotoModal";
import { Switch } from "./ui/switch";

const EditProfile = () => {
  const imageRef = useRef();
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const [input, setInput] = useState({
    profilePhoto: user?.profilePicture,
    bio: user?.bio,
    gender: user?.gender,
  });
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Removed fileChangeHandler as we use ProfilePhotoModal
  
  const selectChangeHandler = (value) => {
    setInput({ ...input, gender: value });
  };

  const editProfileHandler = async () => {
    console.log(input);
    const formData = new FormData();
    formData.append("bio", input.bio || "");
    formData.append("gender", input.gender || "");
    // profilePhoto is handled separately by the modal now, but we keep this for bio/gender updates
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/user/profile/edit`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        const updatedUserData = {
          ...user,
          bio: res.data.user?.bio,
          profilePicture: res.data.user?.profilePicture,
          gender: res.data.user.gender,
        };
        dispatch(setAuthUser(updatedUserData));
        navigate(`/profile/${user?._id}`);
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const togglePrivacyHandler = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/user/toggle-privacy`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        dispatch(setAuthUser({ ...user, isPrivate: res.data.isPrivate }));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to update privacy setting");
    }
  };

  return (
    <div className="flex max-w-2xl mx-auto pl-10">
      <section className="flex flex-col gap-6 w-full my-8">
        <h1 className="font-bold text-xl ">Edit Profile</h1>
        <div className="flex items-center justify-between bg-[#FFFFFF] rounded-xl p-6 border border-gray-300">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border border-gray-300">
              <AvatarImage src={user?.profilePicture} alt="profile" />
              <AvatarFallback className="bg-[#F1E8DF]">
                <FaRegCircleUser className="text-gray-600" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-[#1A1A1A]">{user?.username}</h1>
              <span className="text-gray-600 text-sm">
                {user?.bio || "No bio yet"}
              </span>
            </div>
          </div>

          <Button
            onClick={() => setShowPhotoModal(true)}
            className="bg-[#EADCCA] hover:bg-[#4a4a4a] text-[#1A1A1A] font-semibold h-9"
          >
            Change photo
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="font-bold text-[#1A1A1A] mb-2 ml-1">Bio</h1>
            <Textarea
              value={input.bio}
              name="bio"
              onChange={(e) => setInput({ ...input, bio: e.target.value })}
              className="bg-[#FAF6F0] border-gray-300 text-[#1A1A1A] focus-visible:ring-[#EADCCA] min-h-[100px]"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div>
            <h1 className="font-bold text-[#1A1A1A] mb-2 ml-1">Gender</h1>
            <Select
              defaultValue={input.gender}
              onValueChange={selectChangeHandler}
            >
              <SelectTrigger className="w-full bg-[#FAF6F0] border-gray-300 text-[#1A1A1A] focus:ring-[#EADCCA]">
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent className="bg-[#FAF6F0] border-gray-300 text-[#1A1A1A]">
                <SelectGroup>
                  <SelectItem value="male" className="hover:bg-[#F1E8DF]">Male</SelectItem>
                  <SelectItem value="female" className="hover:bg-[#F1E8DF]">Female</SelectItem>
                  <SelectItem value="prefer_not_to_say" className="hover:bg-[#F1E8DF]">Prefer not to say</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-[#FFFFFF] rounded-xl p-6 border border-gray-300 transition-all hover:border-[#EADCCA]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#FAF6F0] rounded-full border border-gray-300">
                {user?.isPrivate ? (
                  <Lock className="text-[#0095F6]" size={22} />
                ) : (
                  <Globe className="text-gray-600" size={22} />
                )}
              </div>
              <div>
                <h1 className="font-bold text-[#1A1A1A] flex items-center gap-2">
                  Account Privacy
                  {user?.isPrivate && (
                    <span className="text-[10px] bg-[#0095F6]/20 text-[#0095F6] px-2 py-0.5 rounded-full border border-[#0095F6]/30 uppercase tracking-wider">
                      Private
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 text-sm mt-1 max-w-[300px]">
                  {user?.isPrivate 
                    ? "Only people who follow you can see your photos and videos." 
                    : "Anyone on or off Bloom can see your profile and posts."}
                </p>
              </div>
            </div>
            <Switch 
              checked={user?.isPrivate} 
              onCheckedChange={togglePrivacyHandler}
              className="data-[state=checked]:bg-[#0095F6]"
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-[12px] text-gray-600 pl-1">
            <Shield size={14} />
            Your current account is <span className="text-[#1A1A1A] font-medium">{user?.isPrivate ? "Private" : "Public"}</span>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          {loading ? (
            <Button disabled className="w-full md:w-fit bg-[#0095F6] text-[#1A1A1A] font-bold opacity-70">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </Button>
          ) : (
            <Button onClick={editProfileHandler} className="w-full md:w-fit bg-[#0095F6] hover:bg-[#1877F2] text-[#1A1A1A] font-bold px-8">
              Save Changes
            </Button>
          )}
        </div>

        <ProfilePhotoModal 
          open={showPhotoModal}
          onOpenChange={setShowPhotoModal}
          user={user}
        />
      </section>
    </div>
  );
};

export default EditProfile;
