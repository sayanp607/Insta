import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/main";
import ReelItem from "./ReelItem";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";

const Reels = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const targetReelId = location.state?.targetReelId;
  const autoOpenComments = location.state?.openComments;
  const targetCommentId = location.state?.targetCommentId;

  const containerRef = useRef(null);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/post/reels`, {
          withCredentials: true,
        });
        if (res.data.success) {
          let fetchedReels = res.data.posts;
          // If we have a target reel, move it to the top
          if (targetReelId) {
            const targetIndex = fetchedReels.findIndex(r => r._id === targetReelId);
            if (targetIndex !== -1) {
              const targetReel = fetchedReels.splice(targetIndex, 1)[0];
              fetchedReels.unshift(targetReel);
              // Force scroll to top to show the unshifted reel
              if (containerRef.current) {
                containerRef.current.scrollTo(0, 0);
              }
            }
          }
          setReels(fetchedReels);
        }
      } catch (error) {
        console.error("Error fetching reels:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReels();
  }, [targetReelId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#FAF6F0]">
        <Loader2 className="w-10 h-10 animate-spin text-[#1A1A1A] opacity-20" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 lg:left-[18%] bg-[#FAF6F0] overflow-y-scroll snap-y snap-mandatory custom-scrollbar z-0 pb-20 lg:pb-0">
      <div className="w-full max-w-[450px] mx-auto min-h-full">
        {reels.length > 0 ? (
          reels.map((reel) => (
            <ReelItem 
              key={reel._id} 
              reel={reel} 
              autoOpenComments={reel._id === targetReelId && autoOpenComments} 
              targetCommentId={reel._id === targetReelId ? targetCommentId : null}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-screen text-[#1A1A1A]/50">
            <p className="text-lg font-medium">No Reels yet</p>
            <p className="text-sm">Be the first to share a moment!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reels;
