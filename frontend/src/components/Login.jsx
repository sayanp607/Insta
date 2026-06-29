import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import axios from "axios";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "@/redux/authSlice";
import { API_BASE_URL } from "@/main";

const Login = () => {
  const [input, setInput] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();
  const dispatch = useDispatch();
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
        `${API_BASE_URL}/api/v1/user/login`,
        input,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        dispatch(setAuthUser(res.data.user));
        navigate("/");
        toast.success(res.data.message);
        setInput({
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
        className="glass border border-gray-300 flex flex-col gap-6 p-10 rounded-2xl w-full max-w-md animate-in fade-in duration-500"
      >
        <div className="my-2">
          <h1 className="text-center font-bold text-3xl mb-2 insta-gradient-text tracking-tight">Bloom</h1>
          <p className="text-sm text-center text-zinc-500 font-medium">
            Log in to see photos and videos from your friends.
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-zinc-300 ml-1 uppercase">Email</span>
          <Input
            type="email"
            name="email"
            value={input.email}
            onChange={changeEventHandler}
            placeholder="Enter your email"
            className="focus-visible:ring-[#EADCCA] h-12 rounded-xl bg-[#FAF6F0] border-gray-300"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-zinc-300 ml-1 uppercase">Password</span>
          <Input
            type="password"
            name="password"
            value={input.password}
            onChange={changeEventHandler}
            placeholder="Enter your password"
            className="focus-visible:ring-[#EADCCA] h-12 rounded-xl bg-[#FAF6F0] border-gray-300"
          />
        </div>
        {loading ? (
          <Button className="w-full h-12 rounded-xl bg-[#0095F6] text-[#1A1A1A] font-bold opacity-70">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Signing in...
          </Button>
        ) : (
          <Button type="submit" className="w-full h-12 rounded-xl bg-[#0095F6] hover:bg-[#1877F2] text-[#1A1A1A] font-bold transition-all shadow-lg shadow-blue-500/10">
            Login
          </Button>
        )}

        <div className="text-center text-sm pt-4 border-t border-gray-300 mt-2">
          <span className="text-zinc-500">Don't have an account? </span>
          <Link to="/signup" className="text-[#0095F6] font-bold hover:underline">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
