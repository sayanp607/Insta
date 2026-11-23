import { describe, it, expect } from "vitest";
import postReducer, {
  setPosts,
  setSelectedPost,
  setIsGlobalMuted,
  setTargetCommentId,
} from "../../redux/postSlice.js";

describe("Redux Slice: postSlice unit tests", () => {
  const initialState = {
    posts: [],
    selectedPost: null,
    isGlobalMuted: true,
    targetCommentId: null,
  };

  it("should return the initial state", () => {
    expect(postReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("should handle setPosts", () => {
    const mockPosts = [
      { _id: "p1", caption: "Sunset vibes", author: "alice" },
      { _id: "p2", caption: "Coffee morning", author: "bob" },
    ];
    const state = postReducer(initialState, setPosts(mockPosts));
    expect(state.posts).toEqual(mockPosts);
    expect(state.posts).toHaveLength(2);
  });

  it("should handle setSelectedPost", () => {
    const mockPost = { _id: "p1", caption: "Sunset vibes" };
    const state = postReducer(initialState, setSelectedPost(mockPost));
    expect(state.selectedPost).toEqual(mockPost);
  });

  it("should handle setIsGlobalMuted", () => {
    const state = postReducer(initialState, setIsGlobalMuted(false));
    expect(state.isGlobalMuted).toBe(false);
  });

  it("should handle setTargetCommentId", () => {
    const state = postReducer(initialState, setTargetCommentId("c123"));
    expect(state.targetCommentId).toBe("c123");
  });
});
