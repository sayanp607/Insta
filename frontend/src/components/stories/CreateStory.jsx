import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Camera, Image as ImageIcon, Music, Send, Loader2, X } from 'lucide-react';
import { readFileAsDataURL } from '@/lib/utils';
import MusicStep from '../post-upload/MusicStep';
import { toast } from 'sonner';
import axios from 'axios';
import { API_BASE_URL } from '@/main';
import { useDispatch } from 'react-redux';
import { addStoryToAuthor } from '@/redux/storySlice';

const CreateStory = ({ open, onOpenChange }) => {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [step, setStep] = useState('select'); // select, music, share
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        const preview = await readFileAsDataURL(selectedFile);
        setFilePreview(preview);
        setStep('music');
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('media', file);
      if (selectedMusic) {
        formData.append('song', JSON.stringify({
           title: selectedMusic.title,
           artist: selectedMusic.artist,
           url: selectedMusic.url,
           thumbnail: selectedMusic.thumbnail
        }));
      }

      const res = await axios.post(`${API_BASE_URL}/api/v1/story/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });

      if (res.data.success) {
        dispatch(addStoryToAuthor(res.data.story));
        toast.success("Story shared!");
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to share story");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] h-[80vh] bg-[#121212] border-[#262626] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b border-[#262626] flex flex-row items-center justify-between">
          <DialogTitle className="text-white text-base">Create Story</DialogTitle>
          {step !== 'select' && (
            <button onClick={() => setStep('select')} className="text-gray-400 hover:text-white">
                <X size={20} />
            </button>
          )}
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
          {step === 'select' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
              <div className="w-20 h-20 rounded-full bg-[#262626] flex items-center justify-center text-gray-400">
                <Camera size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-white font-bold text-lg">Add to your story</h3>
                <p className="text-gray-500 text-sm mt-1">Share a photo or video with your friends</p>
              </div>
              <input 
                type="file" 
                id="story-file" 
                className="hidden" 
                accept="image/*,video/*"
                onChange={handleFileSelect}
              />
              <label 
                htmlFor="story-file"
                className="bg-[#0095F6] hover:bg-[#1877F2] text-white px-8 py-2 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-2"
              >
                <ImageIcon size={20} />
                Select Media
              </label>
            </div>
          )}

          {step === 'music' && (
            <div className="flex-1 flex flex-col">
               <div className="h-1/3 bg-black relative flex items-center justify-center overflow-hidden">
                  {file?.type.startsWith('video') ? (
                    <video src={filePreview} className="w-full h-full object-cover opacity-50" muted loop autoPlay />
                  ) : (
                    <img src={filePreview} className="w-full h-full object-cover opacity-50" />
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                     <span className="text-white font-bold text-sm mb-4">Add some music?</span>
                     {selectedMusic ? (
                        <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg flex items-center gap-3 border border-white/20 w-full max-w-xs">
                           <img src={selectedMusic.thumbnail} className="w-10 h-10 rounded" />
                           <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-xs truncate">{selectedMusic.title}</p>
                              <p className="text-gray-300 text-[10px] truncate">{selectedMusic.artist}</p>
                           </div>
                           <button onClick={() => setSelectedMusic(null)} className="text-gray-400 hover:text-white">
                              <X size={16} />
                           </button>
                        </div>
                     ) : (
                        <div className="text-gray-400 italic text-xs">No music selected</div>
                     )}
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar bg-black">
                  <MusicStep 
                    selectedSong={selectedMusic}
                    songStart={0}
                    onSongSelect={(m) => setSelectedMusic(m)}
                    onStartChange={() => {}} // Not using segment selection for stories yet
                    onNext={() => setStep('share')}
                    onBack={() => setStep('select')}
                  />
               </div>
               {/* Removed redundant buttons as they are inside MusicStep */}
            </div>
          )}

          {step === 'share' && (
             <div className="flex-1 flex flex-col p-6 items-center">
                <div className="w-full aspect-[9/16] max-h-[400px] bg-black rounded-xl overflow-hidden shadow-2xl relative border border-[#262626]">
                    {file?.type.startsWith('video') ? (
                        <video src={filePreview} className="w-full h-full object-cover" muted loop autoPlay />
                    ) : (
                        <img src={filePreview} className="w-full h-full object-cover" />
                    )}
                    {selectedMusic && (
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4">
                            <div className="bg-black/40 backdrop-blur-sm p-2 rounded-full flex items-center gap-2 border border-white/20 w-fit max-w-full">
                                <Music size={12} className="text-white" />
                                <span className="text-white text-[10px] font-bold truncate">
                                    {selectedMusic.title}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="w-full mt-auto pt-8">
                   <Button 
                    onClick={handleShare} 
                    disabled={loading}
                    className="w-full bg-[#0095F6] hover:bg-[#1877F2] h-12 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                   >
                    {loading ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <>
                            <Send size={18} />
                            Share your story
                        </>
                    )}
                   </Button>
                   <p className="text-center text-gray-500 text-[11px] mt-3">
                     Your story will be visible for 24 hours.
                   </p>
                </div>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStory;
