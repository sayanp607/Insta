import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Search, Play, Pause, Music, Loader2 } from 'lucide-react';
import axios from 'axios';

const MusicStep = ({ selectedSong, songStart, onSongSelect, onStartChange, onNext, onBack }) => {
  const [search, setSearch] = useState('');
  const [musicResults, setMusicResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  // Initial trending/popular search on mount
  useEffect(() => {
    fetchMusic('hindi hits');
  }, []);

  // Debounced search when input changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search.trim()) {
        fetchMusic(search);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const fetchMusic = async (term) => {
    try {
      setLoading(true);
      // Adding country=IN to prioritize Hindi/Bengali/Indian music
      const response = await axios.get(`https://itunes.apple.com/search?term=${term}&entity=song&limit=20&country=IN`);
      const mappedResults = response.data.results.map(item => ({
        id: item.trackId,
        title: item.trackName,
        artist: item.artistName,
        thumbnail: item.artworkUrl100,
        url: item.previewUrl
      }));
      setMusicResults(mappedResults);
    } catch (error) {
      console.error("iTunes API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (audioRef.current && selectedSong) {
      audioRef.current.currentTime = songStart;
      if (playing) {
        audioRef.current.play().catch(e => console.log("Audio playback failed", e));
      }
    }
  }, [selectedSong, songStart, playing]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log("Audio playback failed", e));
    }
    setPlaying(!playing);
  };

  const handleSongClick = (song) => {
    if (selectedSong?.id === song.id) {
       togglePlay(new MouseEvent('click'));
       return;
    }
    
    onSongSelect(song);
    setPlaying(true);
    if (audioRef.current) {
        audioRef.current.src = song.url;
        audioRef.current.play().catch(e => console.log("Audio playback failed", e));
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-[#121212] overflow-hidden rounded-b-xl border-t border-[#262626]">
      <div className="p-4 border-b border-[#262626]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search millions of songs..."
            className="w-full bg-[#262626] rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-gray-500 focus:ring-1 ring-[#0095F6] text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0095F6] animate-spin" size={18} />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        {musicResults.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Music size={48} strokeWidth={1} className="mb-2 opacity-20" />
            <p className="text-sm">No songs found</p>
          </div>
        )}
        
        {musicResults.map((m) => (
          <div 
            key={m.id}
            onClick={() => handleSongClick(m)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${selectedSong?.id === m.id ? 'bg-[#1a1a1a]' : 'hover:bg-[#1a1a1a]'}`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={m.thumbnail} alt={m.title} className="w-12 h-12 rounded-lg object-cover border border-[#262626]" />
                {selectedSong?.id === m.id && playing && (
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                      <div className="flex gap-0.5 h-3 items-end">
                        <div className="w-0.5 bg-white animate-music-bar" style={{animationDelay: '0.1s'}} />
                        <div className="w-0.5 bg-white animate-music-bar" style={{animationDelay: '0.3s'}} />
                        <div className="w-0.5 bg-white animate-music-bar" style={{animationDelay: '0.2s'}} />
                      </div>
                   </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-[180px]">{m.title}</h3>
                <p className="text-xs text-gray-500 truncate max-w-[180px]">{m.artist}</p>
              </div>
            </div>
            {selectedSong?.id === m.id && (
              <div className="text-[#0095F6]">
                {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedSong && (
        <div className="p-6 bg-[#1a1a1a] border-t border-[#262626] animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music size={16} className="text-[#0095F6]" />
                <span className="text-xs font-bold text-white line-clamp-1">{selectedSong.artist} - {selectedSong.title}</span>
              </div>
              <span className="text-[10px] bg-[#0095F6]/20 text-[#0095F6] px-2 py-1 rounded-full font-bold">30s Preview</span>
            </div>
            
            <div className="bg-[#262626] h-1.5 w-full rounded-full overflow-hidden">
               <div className="bg-[#0095F6] h-full animate-progress" />
            </div>
          </div>
          <audio 
            ref={audioRef} 
            src={selectedSong.url} 
            loop 
          />
        </div>
      )}

      <div className="p-4 bg-[#121212] border-t border-[#262626] flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-white hover:bg-[#262626]">Back</Button>
        <Button onClick={onNext} className="bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold px-8">Next</Button>
      </div>
    </div>
  );
};

export default MusicStep;
