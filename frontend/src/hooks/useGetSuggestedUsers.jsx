import { API_BASE_URL } from "@/main";
import { setSuggestedUsers } from "@/redux/authSlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetSuggestedUsers = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const fetchSuggestedusers = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/v1/user/suggested`,
          {
            withCredentials: true,
          }
        );
        if (res.data.success) {
          dispatch(setSuggestedUsers(res.data.users));
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchSuggestedusers();
  }, []);
};

export default useGetSuggestedUsers;
