import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Notification } from "../models/notification.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

export const register = async (req, res) => {
  try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
          return res.status(401).json({
              message: "Something is missing, please check!",
              success: false,
          });
      }
      const user = await User.findOne({ email });
      if (user) {
          return res.status(401).json({
              message: "Try different email",
              success: false,
          });
      };
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
          username,
          email,
          password: hashedPassword
      });
      return res.status(201).json({
          message: "Account created successfully.",
          success: true,
      });
  } catch (error) {
      console.log(error);
  }
}
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
  
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
  
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
  
        const token = await jwt.sign(
            { userId: user._id },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        );
  
        // Populate posts safely
        const populatedPosts = await Promise.all(
            user.posts.map(async (postId) => {
                const post = await Post.findById(postId);
                if (!post) {
                    console.warn(`Post not found for ID: ${postId}`);
                    return null;  // Skip missing posts
                }
                return post.author.equals(user._id) ? post : null;
            })
        );
  
        // Remove null values from the populatedPosts array
        const filteredPosts = populatedPosts.filter(post => post !== null);
  
        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: filteredPosts,
            isPrivate: user.isPrivate
        };
  return res
  .cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000,
  })
  .json({
    message: `Welcome back ${user.username}`,
    success: true,
    user,
  });
  
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
  };
  

export const logout = async (_, res) => {
  try {
      return res.cookie("token", "", { 
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 0 
      }).json({
          message: 'Logged out successfully.',
          success: true
      });
  } catch (error) {
      console.log(error);
  }
};

export const getProfile = async (req, res) => {
  try {
      const requesterId = req.id;
      const userId = req.params.id;
      let user = await User.findById(userId)
        .populate({path:'posts', options: {sort: {createdAt: -1}}})
        .populate('bookmarks')
        .populate('followers', 'username profilePicture bio following')
        .populate('following', 'username profilePicture bio following');

      if (!user) {
          return res.status(404).json({ message: "User not found", success: false });
      }

      // Privacy Logic
      const isOwner = requesterId === userId;
      const isFollowing = user.followers.some(f => f._id.toString() === requesterId);
      const isRequested = user.followRequests.some(id => id.toString() === requesterId);
      const isFollower = user.following.some(f => f._id.toString() === requesterId);
      
      if (user.isPrivate && !isFollowing && userId !== requesterId) {
          return res.status(200).json({
              success: true,
              user: {
                  _id: user._id,
                  username: user.username,
                  profilePicture: user.profilePicture,
                  bio: user.bio,
                  followersCount: user.followers.length,
                  followingCount: user.following.length,
                  postsCount: user.posts.length,
                  isPrivate: true,
                  isFollowing: false,
                  isRequested: isRequested,
                  isFollower: isFollower,
              },
          });
      }

      const userObj = user.toObject();
      userObj.followers = userObj.followers.map(f => ({
          ...f,
          isFollower: f.following.some(id => id.toString() === requesterId)
      }));
      userObj.following = userObj.following.map(f => ({
          ...f,
          isFollower: f.following.some(id => id.toString() === requesterId)
      }));

      return res.status(200).json({
          success: true,
          user: {
              ...userObj,
              isFollowing: isFollowing,
              isRequested: isRequested,
              isFollower: isFollower
          },
      });
  } catch (error) {
      console.log(error);
  }
};
export const editProfile = async (req, res) => {
  try {
      const userId = req.id;
      const { bio, gender } = req.body;
      const profilePicture = req.file;
      let cloudResponse;

      if (profilePicture) {
          const fileUri = getDataUri(profilePicture);
          cloudResponse = await cloudinary.uploader.upload(fileUri);
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
          return res.status(404).json({
              message: 'User not found.',
              success: false
          });
      };
      if (bio) user.bio = bio;
      if (gender) user.gender = gender;
      if (profilePicture) user.profilePicture = cloudResponse.secure_url;

      await user.save();

      return res.status(200).json({
          message: 'Profile updated.',
          success: true,
          user
      });

  } catch (error) {
      console.log(error);
  }
};

export const togglePrivacy = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found", success: false });

        user.isPrivate = !user.isPrivate;
        await user.save();

        return res.status(200).json({
            message: `Account is now ${user.isPrivate ? "Private" : "Public"}`,
            success: true,
            isPrivate: user.isPrivate
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const requesterId = req.id;
        const users = await User.find({ _id: { $ne: requesterId } }).select("-password");
        
        const suggestedUsers = users.map(u => ({
            ...u.toObject(),
            isFollower: u.following.some(id => id.toString() === requesterId)
        }));

        if (!suggestedUsers || suggestedUsers.length === 0) {
            return res.status(200).json({
                success: true,
                users: []
            })
        };
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log(error);
    }
};

export const followOrUnfollow = async (req, res) => {
    try {
        const followKrneWala = req.id;
        const jiskoFollowKrunga = req.params.id;

        if (!jiskoFollowKrunga || jiskoFollowKrunga === "undefined") {
            return res.status(400).json({ message: 'Invalid user ID', success: false });
        }
        if (followKrneWala === jiskoFollowKrunga) {
            return res.status(400).json({ message: 'You cannot follow yourself', success: false });
        }

        const user = await User.findById(followKrneWala);
        const targetUser = await User.findById(jiskoFollowKrunga);

        if (!user || !targetUser) {
            return res.status(400).json({ message: 'User not found', success: false });
        }

        const isFollowing = user.following.some(id => id.toString() === jiskoFollowKrunga.toString());

        if (isFollowing) {
            // Unfollow logic
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $pull: { following: jiskoFollowKrunga } }),
                User.updateOne({ _id: jiskoFollowKrunga }, { $pull: { followers: followKrneWala } }),
            ]);
            return res.status(200).json({ message: 'Unfollowed successfully', success: true, isFollowing: false });
        } else {
            // If target account is private, send follow request
            if (targetUser.isPrivate) {
                const hasRequested = targetUser.followRequests.some(id => id.toString() === followKrneWala.toString());
                if (hasRequested) {
                    // Cancel request
                    await User.updateOne({ _id: jiskoFollowKrunga }, { $pull: { followRequests: followKrneWala } });
                    // Remove pending notification
                    await Notification.deleteOne({ receiver: jiskoFollowKrunga, sender: followKrneWala, type: 'followRequest' });
                    
                    return res.status(200).json({ message: 'Follow request cancelled', success: true, isRequested: false });
                } else {
                    // Send request
                    await User.updateOne({ _id: jiskoFollowKrunga }, { $push: { followRequests: followKrneWala } });
                    
                    // Create persistent notification
                    const notification = await Notification.create({
                        receiver: jiskoFollowKrunga,
                        sender: followKrneWala,
                        type: 'followRequest',
                        message: `${user.username} wants to follow you.`
                    });

                    // Socket notification
                    const receiverSocketId = getReceiverSocketId(jiskoFollowKrunga);
                    if (receiverSocketId) {
                        const populatedNotification = await Notification.findById(notification._id).populate('sender', 'username profilePicture');
                        io.to(receiverSocketId).emit('notification', populatedNotification);
                    }

                    return res.status(200).json({ message: 'Follow request sent', success: true, isRequested: true });
                }
            } else {
                // Public follow logic
                await Promise.all([
                    User.updateOne({ _id: followKrneWala }, { $push: { following: jiskoFollowKrunga } }),
                    User.updateOne({ _id: jiskoFollowKrunga }, { $push: { followers: followKrneWala } }),
                ]);

                // Create persistent notification
                const notification = await Notification.create({
                    receiver: jiskoFollowKrunga,
                    sender: followKrneWala,
                    type: 'follow',
                    message: `${user.username} started following you.`
                });

                // Socket notification
                const receiverSocketId = getReceiverSocketId(jiskoFollowKrunga);
                if (receiverSocketId) {
                    const populatedNotification = await Notification.findById(notification._id).populate('sender', 'username profilePicture');
                    io.to(receiverSocketId).emit('notification', populatedNotification);
                }

                return res.status(200).json({ message: 'Followed successfully', success: true, isFollowing: true });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
}

export const acceptFollowRequest = async (req, res) => {
    try {
        const userId = req.id; // The person who owns the private account
        const requesterId = req.params.id; // The person who wants to follow

        const user = await User.findById(userId);
        if (!user.followRequests.includes(requesterId)) {
            return res.status(400).json({ message: "No such follow request", success: false });
        }

        // Move from requests to followers
        await Promise.all([
            User.updateOne({ _id: userId }, { $pull: { followRequests: requesterId }, $push: { followers: requesterId } }),
            User.updateOne({ _id: requesterId }, { $push: { following: userId } }),
            Notification.updateOne(
                { receiver: userId, sender: requesterId, type: 'followRequest' },
                { $set: { type: 'follow', message: 'started following you', isRead: true } }
            )
        ]);

        // Notify requester that request was accepted
        const notification = await Notification.create({
            receiver: requesterId,
            sender: userId,
            type: 'follow',
            message: `${user.username} accepted your follow request.`
        });

        const requesterSocketId = getReceiverSocketId(requesterId);
        if (requesterSocketId) {
            io.to(requesterSocketId).emit('notification', {
                ...notification.toObject(),
                userDetails: { username: user.username, profilePicture: user.profilePicture }
            });
        }

        return res.status(200).json({ message: "Follow request accepted", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
}

export const declineFollowRequest = async (req, res) => {
    try {
        const userId = req.id;
        const requesterId = req.params.id;

        await Promise.all([
            User.updateOne({ _id: userId }, { $pull: { followRequests: requesterId } }),
            Notification.deleteOne({ receiver: userId, sender: requesterId, type: 'followRequest' })
        ]);

        // Optional: Send notification for decline (Instagram doesn't usually do this, but the user requested it)
        const user = await User.findById(userId);
        const declineNotification = await Notification.create({
            receiver: requesterId,
            sender: userId,
            type: 'follow_declined',
            message: `${user.username} declined your follow request.`
        });

        const requesterSocketId = getReceiverSocketId(requesterId);
        if (requesterSocketId) {
            const populatedNotification = await Notification.findById(declineNotification._id).populate('sender', 'username profilePicture');
            io.to(requesterSocketId).emit('notification', populatedNotification);
        }

        return res.status(200).json({ message: "Follow request declined", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
}

export const getNotifications = async (req, res) => {
    try {
        const userId = req.id;
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ receiver: userId })
                .sort({ createdAt: -1 })
                .populate('sender', 'username profilePicture')
                .populate('post', 'image mediaType'),
            Notification.countDocuments({ receiver: userId, isRead: false })
        ]);

        return res.status(200).json({ 
            notifications, 
            unreadCount: parseInt(unreadCount) || 0,
            success: true 
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
}

export const markNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.id;
        // 1. Reset Redis counter (PAUSED)
        // await redisClient.del(`user:${userId}:unread_count`);
        
        // 2. Mark in MongoDB
        await Notification.updateMany(
            { receiver: userId, isRead: false },
            { $set: { isRead: true } }
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error', success: false });
    }
}