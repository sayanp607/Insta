import { describe, it, expect } from "vitest";
import authReducer, {
  setAuthUser,
  setSuggestedUsers,
  setUserProfile,
  setSelectedUser,
} from "../../redux/authSlice.js";

describe("Redux Slice: authSlice unit tests", () => {
  const initialState = {
    user: null,
    suggestedUsers: [],
    userProfile: null,
    selectedUser: null,
  };

  it("should return the initial state on empty action", () => {
    expect(authReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("should handle setAuthUser", () => {
    const mockUser = { _id: "u123", username: "john_doe", email: "john@example.com" };
    const state = authReducer(initialState, setAuthUser(mockUser));
    expect(state.user).toEqual(mockUser);
  });

  it("should handle setSuggestedUsers", () => {
    const mockUsers = [
      { _id: "u1", username: "alice" },
      { _id: "u2", username: "bob" },
    ];
    const state = authReducer(initialState, setSuggestedUsers(mockUsers));
    expect(state.suggestedUsers).toEqual(mockUsers);
    expect(state.suggestedUsers).toHaveLength(2);
  });

  it("should handle setUserProfile", () => {
    const mockProfile = { _id: "u1", username: "alice", bio: "Photographer" };
    const state = authReducer(initialState, setUserProfile(mockProfile));
    expect(state.userProfile).toEqual(mockProfile);
  });

  it("should handle setSelectedUser", () => {
    const mockSelected = { _id: "u2", username: "bob" };
    const state = authReducer(initialState, setSelectedUser(mockSelected));
    expect(state.selectedUser).toEqual(mockSelected);
  });
});
