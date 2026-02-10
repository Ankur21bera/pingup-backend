import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDb from './config/db.js';
import { serve } from "inngest/express";
import { inngest,functions } from './inngest/index.js';
<<<<<<< HEAD
=======
import {clerkMiddleware} from '@clerk/express'
import userRouter from './Route/userRoute.js';
>>>>>>> 52e352f (initial commit)



const app = express();

connectDb()

app.use(express.json());
app.use(cors());
<<<<<<< HEAD

app.get("/",(req,res)=>res.send("Server Is Running"))
app.use("/api/inngest", serve({ client: inngest, functions }));
=======
app.use(clerkMiddleware());

app.get("/",(req,res)=>res.send("Server Is Running"))
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/user",userRouter)
>>>>>>> 52e352f (initial commit)

const PORT = process.env.PORT || 4000;

app.listen(PORT,()=>console.log(`Server Is Running On Port ${PORT}`))