import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/main';
import { Heart, MessageCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedPost } from '@/redux/postSlice';
import CommentDialog from './CommentDialog';

const Explore = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const dispatch = useDispatch();
    const { selectedPost } = useSelector(store => store.post);

    useEffect(() => {
        const fetchExplorePosts = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/v1/post/explore`, { withCredentials: true });
                if (res.data.success) {
                    setPosts(res.data.posts);
                }
            } catch (error) {
                console.error("Error fetching explore posts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchExplorePosts();
    }, []);

    const handlePostClick = (post) => {
        dispatch(setSelectedPost(post));
        setOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0095F6]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-xl font-bold mb-6 text-[#1A1A1A] px-2">Explore</h1>
            <div className="grid grid-cols-3 gap-1 md:gap-4">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <div 
                            key={post._id} 
                            className="relative aspect-square cursor-pointer group overflow-hidden rounded-sm md:rounded-md transition-all hover:scale-[1.02]"
                            onClick={() => handlePostClick(post)}
                        >
                            <img 
                                src={post.image} 
                                alt="explore_post" 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-[#FAF6F0]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-[#1A1A1A] font-bold">
                                <div className="flex items-center gap-2">
                                    <Heart className="fill-white" size={20} />
                                    <span>{post.likes?.length || 0}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="fill-white" size={20} />
                                    <span>{post.comments?.length || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-3 text-center py-20 text-gray-600">
                        No posts to explore yet! Check back later.
                    </div>
                )}
            </div>

            {/* Reuse CommentDialog for post details */}
            <CommentDialog open={open} setOpen={setOpen} />
        </div>
    );
};

export default Explore;
