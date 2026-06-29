import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import axios from 'axios';
import { API_BASE_URL } from '@/main';
import { setNotifications, markNotificationsAsRead } from '@/redux/rtnSlice';
import { setSelectedPost, setTargetCommentId } from '@/redux/postSlice';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { User, Heart, MessageCircle, UserPlus, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const Notifications = () => {
    const { allNotifications } = useSelector(store => store.realTimeNotification);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    React.useEffect(() => {
        const markAsRead = async () => {
            try {
                await axios.post(`${API_BASE_URL}/api/v1/user/notifications/mark-as-read`, {}, { withCredentials: true });
                dispatch(markNotificationsAsRead());
            } catch (error) {
                console.log("Error marking notifications as read:", error);
            }
        };
        if (allNotifications.some(n => !n.isRead)) {
            markAsRead();
        }
    }, [dispatch, allNotifications]);

    const handleAccept = async (requesterId) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/user/follow-request/accept/${requesterId}`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);
                const fetchRes = await axios.get(`${API_BASE_URL}/api/v1/user/notifications`, { withCredentials: true });
                if (fetchRes.data.success) {
                    dispatch(setNotifications(fetchRes.data.notifications));
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        }
    };

    const handleDecline = async (requesterId) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/user/follow-request/decline/${requesterId}`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(res.data.message);
                const updatedNotifs = allNotifications.filter(n => !(n.sender._id === requesterId && n.type === 'followRequest'));
                dispatch(setNotifications(updatedNotifs));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        }
    };

    const handleNotificationClick = (notification) => {
        if (notification.type === 'like' || notification.type === 'comment') {
            if (notification.post) {
                // If it's a Reels notification (video), navigate to reels
                if (notification.post.mediaType === 'video') {
                    navigate('/reels', { 
                        state: { 
                            targetReelId: notification.post._id,
                            openComments: true,
                            targetCommentId: notification.comment
                        } 
                    });
                } else {
                    // It's a regular post
                    dispatch(setSelectedPost(notification.post));
                    if (notification.comment) {
                        dispatch(setTargetCommentId(notification.comment));
                    }
                    navigate('/');
                }
            }
        } else if (notification.type === 'follow' || notification.type === 'followRequest') {
            navigate(`/profile/${notification.sender?._id || notification.sender}`);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'like': return <Heart className="w-3 h-3 text-red-500 fill-red-500" />;
            case 'comment': return <MessageCircle className="w-3 h-3 text-blue-500 fill-blue-500" />;
            case 'follow': case 'followRequest': return <UserPlus className="w-3 h-3 text-green-500" />;
            default: return null;
        }
    };

    return (
        <div className='flex-1 min-h-screen bg-[#FAF6F0] text-[#1A1A1A] p-4 md:p-8 max-w-2xl mx-auto'>
            <h1 className='font-bold text-2xl mb-8 tracking-tight'>Notifications</h1>
            <div className='flex flex-col gap-2'>
                {allNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#1A1A1A]/40 gap-4">
                        <Heart className="w-16 h-16 stroke-[1]" />
                        <p className='text-sm font-medium'>No notifications yet.</p>
                    </div>
                ) : (
                    allNotifications.map((notification, index) => {
                        const senderId = notification.sender?._id || notification.sender;
                        return (
                            <motion.div 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
                                key={notification._id} 
                                onClick={() => handleNotificationClick(notification)}
                                className='flex items-center justify-between gap-4 p-4 rounded-xl hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10 group cursor-pointer'
                            >
                                <div className='flex items-center gap-4 flex-1'>
                                    <div className="relative shrink-0">
                                        <Avatar className="w-12 h-12 border border-white/10 ring-2 ring-transparent group-hover:ring-white/20 transition-all">
                                            <AvatarImage src={notification.sender?.profilePicture} />
                                            <AvatarFallback className="bg-[#F1E8DF] text-[#1A1A1A]/50">
                                                <User size={20} />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 bg-[#FAF6F0] rounded-full p-1 border border-white/10">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className='text-sm leading-snug'>
                                            <span className='font-bold hover:underline'>
                                                {notification.sender?.username || notification.userDetails?.username}
                                            </span>
                                            {" "}
                                            <span className="text-[#1A1A1A]/90">{notification.message}</span>
                                        </p>
                                        <span className='text-[11px] text-[#1A1A1A]/40 mt-1 block font-medium uppercase tracking-wider'>
                                            {new Date(notification.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                
                                {notification.type === 'followRequest' && (
                                    <div className='flex gap-2 shrink-0' onClick={e => e.stopPropagation()}>
                                        <Button 
                                            onClick={() => handleAccept(senderId)}
                                            className='bg-[#0095F6] hover:bg-[#1877F2] text-[#1A1A1A] h-8 px-4 text-xs font-bold rounded-lg'
                                        >
                                            Accept
                                        </Button>
                                        <Button 
                                            onClick={() => handleDecline(senderId)}
                                            variant='ghost'
                                            className='h-8 px-4 text-xs font-bold hover:bg-white/10 text-[#1A1A1A] border border-white/20 rounded-lg'
                                        >
                                            Decline
                                        </Button>
                                    </div>
                                )}

                                {(notification.type === 'like' || notification.type === 'comment') && notification.post && (
                                    <div className="shrink-0">
                                        <div className='w-12 h-12 bg-[#F1E8DF] rounded-lg overflow-hidden border border-white/10 hover:opacity-80 transition-opacity relative group/thumb'>
                                            {notification.post.video || notification.post.image?.includes('video') ? (
                                                <div className="w-full h-full flex items-center justify-center relative">
                                                    <video src={notification.post.image || notification.post.video} className="w-full h-full object-cover" />
                                                    <Play className="absolute inset-0 m-auto w-4 h-4 text-[#1A1A1A] fill-white opacity-60 group-hover/thumb:opacity-100 transition-opacity" />
                                                </div>
                                            ) : (
                                                <img src={notification.post.image} alt="Post" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )
                    })
                )}
            </div>
        </div>
    );
};

export default Notifications;
