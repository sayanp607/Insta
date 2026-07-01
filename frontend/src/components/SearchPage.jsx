import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { FaRegCircleUser } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/main";

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/user/search?query=${query}`, {
        withCredentials: true
      });
      if (res.data.success) {
        setSearchResults(res.data.users);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-20 lg:pb-0">
      <div className="p-4 bg-white border-b sticky top-0 z-10 shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Search</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search for users..." 
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-3 bg-gray-100/80 focus:bg-white focus:ring-2 focus:ring-pink-200 border-none rounded-2xl transition-all duration-300 outline-none text-base"
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400 w-5 h-5" />}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {searchQuery && searchResults.length === 0 && !isSearching && (
           <p className="text-center text-gray-500 mt-10">No users found.</p>
        )}
        
        {searchResults.map((searchUser) => (
          <div 
            key={searchUser._id} 
            onClick={() => navigate(`/profile/${searchUser._id}`)}
            className="flex items-center gap-4 p-3 bg-white hover:bg-gray-50 rounded-2xl cursor-pointer shadow-sm transition-all"
          >
            <Avatar className="w-14 h-14 border border-gray-100">
              <AvatarImage src={searchUser?.profilePicture} alt={searchUser?.username} />
              <AvatarFallback><FaRegCircleUser className="w-7 h-7 text-gray-400" /></AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900">{searchUser?.username}</span>
              <span className="text-sm text-gray-500 line-clamp-1">{searchUser?.bio || "No bio available"}</span>
              {searchUser.similarity_score && (
                <span className="text-[10px] text-pink-500 font-medium">✨ Semantic Match</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;
