import { API_BASE_URL } from "@/main";
import axios from "axios";
import { useEffect, useState } from "react";

const useGetHighlights = (userId) => {
    const [highlights, setHighlights] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchHighlights = async () => {
            if (!userId) return;
            try {
                setLoading(true);
                const res = await axios.get(`${API_BASE_URL}/api/v1/highlight/user/${userId}`);
                if (res.data.success) {
                    setHighlights(res.data.highlights);
                }
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        }
        fetchHighlights();
    }, [userId]);

    return { highlights, loading };
};

export default useGetHighlights;
