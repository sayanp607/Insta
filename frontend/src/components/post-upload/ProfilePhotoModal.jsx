import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Camera, X, Check, Loader2, Minus, Plus } from 'lucide-react';
import getCroppedImg from '@/lib/imageProcessing';
import { readFileAsDataURL } from '@/lib/utils';
import { toast } from 'sonner';
import axios from 'axios';
import { API_BASE_URL } from '@/main';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '@/redux/authSlice';

const ProfilePhotoModal = ({ open, onOpenChange, user }) => {
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFileAsDataURL(file);
      setImage(imageDataUrl);
    }
  };

  const handleUpload = async () => {
    try {
      setLoading(true);
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      
      // Convert blob URL to file
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'profile.webp', { type: 'image/webp' });

      const formData = new FormData();
      formData.append('profilePhoto', file);

      const res = await axios.post(`${API_BASE_URL}/api/v1/user/profile/edit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      if (res.data.success) {
        dispatch(setAuthUser(res.data.user));
        toast.success('Profile picture updated!');
        onOpenChange(false);
        setImage(null);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#121212] border-[#262626] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-[#262626]">
          <DialogTitle className="text-center text-white font-bold text-base">Change Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center">
          {!image ? (
            <div className="py-12 flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-[#262626] flex items-center justify-center text-gray-400">
                <Camera size={40} strokeWidth={1} />
              </div>
              <input
                type="file"
                id="profile-upload"
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
              />
              <label 
                htmlFor="profile-upload"
                className="bg-[#0095F6] hover:bg-[#1877F2] text-white px-6 py-2 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Upload Photo
              </label>
              {user?.profilePicture && (
                 <button className="text-[#ED4956] font-bold text-sm hover:text-[#c43b46] transition-colors">
                    Remove Current Photo
                 </button>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col">
              <div className="relative w-full h-[300px] bg-black">
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                   <Minus size={16} className="text-gray-400" />
                   <input
                     type="range"
                     value={zoom}
                     min={1}
                     max={3}
                     step={0.1}
                     onChange={(e) => setZoom(parseFloat(e.target.value))}
                     className="flex-1 accent-[#0095F6] bg-[#262626] h-1 rounded-lg appearance-none cursor-pointer"
                   />
                   <Plus size={16} className="text-gray-400" />
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={() => setImage(null)}
                    disabled={loading}
                    className="flex-1 text-white hover:bg-[#262626]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={loading}
                    className="flex-1 bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : 'Set New Photo'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePhotoModal;
