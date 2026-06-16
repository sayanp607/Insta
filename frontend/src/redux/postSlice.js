import { createSlice } from "@reduxjs/toolkit";
const postSlice = createSlice({
  name: "post",
  initialState: {
    posts: [],
    selectedPost: null,
    isGlobalMuted: true,
    targetCommentId: null,
  },
  reducers: {
    //actions
    setPosts: (state, action) => {
      state.posts = action.payload;
    },
    setSelectedPost: (state, action) => {
      state.selectedPost = action.payload;
    },
    setIsGlobalMuted: (state, action) => {
      state.isGlobalMuted = action.payload;
    },
    setTargetCommentId: (state, action) => {
      state.targetCommentId = action.payload;
    },
  },
});
export const { setPosts, setSelectedPost, setIsGlobalMuted, setTargetCommentId } = postSlice.actions;
export default postSlice.reducer;
