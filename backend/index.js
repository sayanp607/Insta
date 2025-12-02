import express ,{ urlencoded }from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import {app,server} from "./socket/socket.js"
dotenv.config({});

const PORT = process.env.PORT || 3000;
app.get("/",(req,res)=>{
    return res.status(200).json({
      message:"I'm coming from backend",
      success:true
    })
})

app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({extended:true}));
const allowedOrigins = [
  'http://localhost:5173',
  'https://insta-frontend-ehjp.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));


// yha pr apni api ayengi
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);



server.listen(PORT,()=>{
  connectDB();
  console.log(`server running on ${PORT}`)
})