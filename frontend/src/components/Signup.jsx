import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import axios from "axios";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { API_BASE_URL } from "@/main";
const Signup = () => {
  const [input, setInput] = useState({
    username: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const { user } = useSelector((store) => store.auth);
  const [loading, setLoading] = useState(false);
  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const signupHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log(input);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/user/register`,
        input,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        navigate("/login");
        toast.success(res.data.message);
        setInput({
          username: "",
          email: "",
          password: "",
        });
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  });
  return (
    <div className="flex items-center w-screen h-screen justify-center">
      <form
        onSubmit={signupHandler}
        className="glass border border-[#262626] flex flex-col gap-6 p-10 rounded-2xl w-full max-w-md animate-in fade-in duration-500"
      >
        <div className="my-2">
          <h1 className="text-center font-bold text-3xl mb-2 insta-gradient-text tracking-tight">Instagram</h1>
          <p className="text-sm text-center text-zinc-500 font-medium">
            Sign up to see photos and videos from your friends.
          </p>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-zinc-300 ml-1 uppercase">Username</span>
          <Input
            type="text"
            name="username"
            value={input.username}
            onChange={changeEventHandler}
            placeholder="Choose a username"
            className="focus-visible:ring-[#363636] h-12 rounded-xl bg-[#121212] border-[#262626]"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-zinc-300 ml-1 uppercase">Email</span>
          <Input
            type="email"
            name="email"
            value={input.email}
            onChange={changeEventHandler}
            placeholder="Enter your email"
            className="focus-visible:ring-[#363636] h-12 rounded-xl bg-[#121212] border-[#262626]"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-zinc-300 ml-1 uppercase">Password</span>
          <Input
            type="password"
            name="password"
            value={input.password}
            onChange={changeEventHandler}
            placeholder="Create a password"
            className="focus-visible:ring-[#363636] h-12 rounded-xl bg-[#121212] border-[#262626]"
          />
        </div>
        {loading ? (
          <Button className="w-full h-12 rounded-xl bg-[#0095F6] text-white font-bold opacity-70">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Creating account...
          </Button>
        ) : (
          <Button type="submit" className="w-full h-12 rounded-xl bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold transition-all shadow-lg shadow-blue-500/10">
            Sign up
          </Button>
        )}

        <div className="text-center text-sm pt-4 border-t border-[#262626] mt-2">
          <span className="text-zinc-500">Already have an account? </span>
          <Link to="/login" className="text-[#0095F6] font-bold hover:underline">
            Log in
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Signup;
