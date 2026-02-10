import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDb from './config/db.js';
import { serve } from "inngest/express";
import { inngest,functions } from './inngest/index.js';


import {clerkMiddleware} from '@clerk/express'
import userRouter from './Route/userRoute.js';




const app = express();

connectDb()

app.use(express.json());
app.use(cors());

app.get("/",(req,res)=>res.send("Server Is Running"))
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use(clerkMiddleware());

app.get("/",(req,res)=>res.send("Server Is Running"))
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/user",userRouter)


const PORT = process.env.PORT || 4000;

app.listen(PORT,()=>console.log(`Server Is Running On Port ${PORT}`))