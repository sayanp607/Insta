import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import authSlice from "../../redux/authSlice.js";
import Login from "../../components/Login.jsx";

vi.mock("axios");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createTestStore = (preloadedState = {}) =>
  configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState,
  });

describe("Integration: Login Component", () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createTestStore({ auth: { user: null } });
  });

  it("renders email, password inputs, submit button, and signup link", () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText(/Bloom/i)).toBeInTheDocument();
    expect(screen.getByText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Login$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign\s*up/i })).toBeInTheDocument();
  });

  it("updates input values on user typing", () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );

    const emailInput = document.querySelector('input[name="email"]');
    const passwordInput = document.querySelector('input[name="password"]');

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "pass1234" } });

    expect(emailInput.value).toBe("user@example.com");
    expect(passwordInput.value).toBe("pass1234");
  });

  it("dispatches setAuthUser and triggers toast on successful login", async () => {
    const mockUser = { _id: "user_100", username: "superstar", email: "user@example.com" };
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Login successful!",
        user: mockUser,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );

    const emailInput = document.querySelector('input[name="email"]');
    const passwordInput = document.querySelector('input[name="password"]');
    const submitButton = screen.getByRole("button", { name: /^Login$/i });

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "pass1234" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/user/login"),
        { email: "user@example.com", password: "pass1234" },
        expect.any(Object)
      );
      expect(store.getState().auth.user).toEqual(mockUser);
      expect(toast.success).toHaveBeenCalledWith("Login successful!");
    });
  });

  it("shows error toast when login fails with 401", async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: "Incorrect email or password",
        },
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );

    const emailInput = document.querySelector('input[name="email"]');
    const passwordInput = document.querySelector('input[name="password"]');
    const submitButton = screen.getByRole("button", { name: /^Login$/i });

    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Incorrect email or password");
      expect(store.getState().auth.user).toBeNull();
    });
  });
});
