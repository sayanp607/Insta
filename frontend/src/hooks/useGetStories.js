import { API_BASE_URL } from "@/main";
import { setStories } from "@/redux/storySlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetStories = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchStories = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/v1/story/all`, { withCredentials: true });
                if (res.data.success) {
                    dispatch(setStories(res.data.stories));
                }
            } catch (error) {
                console.log(error);
            }
        }
        fetchStories();
    }, [dispatch]);
};

export default useGetStories;
