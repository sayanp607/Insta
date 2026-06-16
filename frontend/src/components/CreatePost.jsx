import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { readFileAsDataURL } from "@/lib/utils";
import { X, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setPosts } from "@/redux/postSlice";
import { API_BASE_URL } from "@/main";
import CropStep from "./post-upload/CropStep";
import FilterStep from "./post-upload/FilterStep";
import MusicStep from "./post-upload/MusicStep";
import FinalizeStep from "./post-upload/FinalizeStep";
import getCroppedImg from "@/lib/imageProcessing";
import confetti from 'canvas-confetti';

const CreatePost = ({ open, setOpen }) => {
  const imageRef = useRef();
  const [step, setStep] = useState(1); // 1: Select, 2: Crop, 3: Filter, 4: Music, 5: Share
  const [rawImage, setRawImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [filter, setFilter] = useState("none");
  const [caption, setCaption] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);
  const [songStart, setSongStart] = useState(0);
  
  const [pixelCrop, setPixelCrop] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const { posts } = useSelector((store) => store.post);

  const [mediaFile, setMediaFile] = useState(null);

  const fileChangeHandler = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const dataUrl = await readFileAsDataURL(file);
      setRawImage(dataUrl);
      if (file.type.startsWith("video/")) {
        setStep(3); // Skip crop but allow filters/music for videos
      } else {
        setStep(2);
      }
    }
  };

  const onCropComplete = async (pxCrop) => {
    try {
      setPixelCrop(pxCrop);
      const cropped = await getCroppedImg(rawImage, pxCrop);
      setCroppedImage(cropped);
      setStep(3);
    } catch (e) {
      console.error(e);
      toast.error("Failed to crop image");
    }
  };

  const generateAICaptions = async () => {
    try {
      setAiLoading(true);
      let file;

      if (mediaFile && mediaFile.type.startsWith("video/")) {
        // Capture a frame from the video for AI analysis
        file = await new Promise((resolve) => {
          const video = document.createElement("video");
          video.src = URL.createObjectURL(mediaFile);
          video.crossOrigin = "anonymous";
          video.currentTime = 1; // Capture frame at 1 second
          
          video.onseeked = () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.filter = filter; // Apply user's selected filter to the frame!
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              resolve(new File([blob], "video_frame.jpg", { type: "image/jpeg" }));
            }, "image/jpeg");
          };
        });
      } else {
        // Process current image with filter
        const finalImageBlob = await getCroppedImg(rawImage, pixelCrop, 0, { horizontal: false, vertical: false }, filter);
        const response = await fetch(finalImageBlob);
        const blob = await response.blob();
        file = new File([blob], "post_image.webp", { type: "image/webp" });
      }

      const formData = new FormData();
      formData.append("image", file);

      const res = await axios.post(`${API_BASE_URL}/api/v1/post/generate-ai-content`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.data.success) {
        setAiSuggestions(res.data.suggestions);
      }
    } catch (error) {
      toast.error("AI analysis failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const createPostHandler = async () => {
    let fileToUpload;

    if (mediaFile && mediaFile.type.startsWith("video/")) {
      fileToUpload = mediaFile;
    } else {
      // Final processing with filter applied to the original crop
      const finalImageBlob = await getCroppedImg(rawImage, pixelCrop, 0, { horizontal: false, vertical: false }, filter);
      const response = await fetch(finalImageBlob);
      const blob = await response.blob();
      fileToUpload = new File([blob], "post_image.webp", { type: "image/webp" });
    }

    const formData = new FormData();
    formData.append("caption", caption);
    formData.append("image", fileToUpload);
    if (selectedSong) {
      formData.append("song", JSON.stringify(selectedSong));
      formData.append("songStart", songStart);
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/post/addpost`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        dispatch(setPosts([res.data.post, ...posts]));
        toast.success("Post shared successfully!");
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888']
        });
        resetState();
        setOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setRawImage(null);
    setCroppedImage(null);
    setFilter("none");
    setCaption("");
    setSelectedSong(null);
    setSongStart(0);
    setPixelCrop(null);
    setAiSuggestions([]);
    setAiLoading(false);
    setMediaFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if(!val) { setOpen(false); resetState(); }}}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-xl">
        <div className="bg-[#121212] rounded-xl overflow-hidden border border-[#262626]">
          <div className="flex items-center justify-between p-3 border-b border-[#262626] bg-[#121212]">
            {step > 1 && step < 6 ? (
              <button onClick={() => setStep(step - 1)} className="text-white hover:text-gray-400 transition-colors">
                <ArrowLeft size={24} />
              </button>
            ) : <div className="w-6" />}
            
            <h2 className="text-md font-bold text-white">
              {step === 1 && "Create New Post"}
              {step === 2 && "Crop"}
              {step === 3 && "Edit"}
              {step === 4 && "Add Music"}
              {step === 5 && "Share"}
            </h2>

            <button onClick={() => { setOpen(false); resetState(); }} className="text-white hover:text-gray-400 transition-colors">
              <X size={24} />
            </button>
          </div>

          {step === 1 && (
            <div className="flex flex-col items-center justify-center h-[500px] gap-6 p-8 text-center bg-[#121212]">
              <div className="p-6 bg-[#1a1a1a] rounded-full border border-[#262626]">
                <ImageIcon size={64} className="text-gray-400" strokeWidth={1} />
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">Drag photos and videos here</h3>
                <p className="text-gray-500 text-sm mb-6">High resolution images work best</p>
                <input
                  ref={imageRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={fileChangeHandler}
                />
                <Button
                  onClick={() => imageRef.current.click()}
                  className="bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold px-8 rounded-lg"
                >
                  Select from computer
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <CropStep 
              image={rawImage} 
              onNext={onCropComplete} 
              onCancel={() => { setOpen(false); resetState(); }} 
            />
          )}

          {step === 3 && (
            <FilterStep 
              image={mediaFile?.type.startsWith("video/") ? rawImage : croppedImage} 
              selectedFilter={filter}
              onFilterSelect={setFilter}
              onNext={() => setStep(4)}
              onBack={() => mediaFile?.type.startsWith("video/") ? setStep(1) : setStep(2)}
              isVideo={mediaFile?.type.startsWith("video/")}
            />
          )}

          {step === 4 && (
            <MusicStep 
              selectedSong={selectedSong}
              songStart={songStart}
              onSongSelect={setSelectedSong}
              onStartChange={setSongStart}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}

          {step === 5 && (
            <FinalizeStep 
              image={mediaFile?.type.startsWith("video/") ? rawImage : croppedImage}
              filter={filter}
              caption={caption}
              setCaption={setCaption}
              song={selectedSong}
              user={user}
              onPost={createPostHandler}
              onBack={() => setStep(4)}
              loading={loading}
              onAISuggest={generateAICaptions}
              aiLoading={aiLoading}
              aiSuggestions={aiSuggestions}
              isVideo={mediaFile?.type.startsWith("video/")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePost;
