import express from 'express';
import { protect } from '../middleware/auth.js';
import { acceptConnectionRequest, Discoverusers, followUser, getUserConnections, getUserData, sendConnectionRequest, unfollowUser, updateUserData } from '../Controllers/userController.js';
import { upload } from '../config/multer.js';


const userRouter = express.Router();

userRouter.get("/me",protect,getUserData);
userRouter.put("/update",protect,upload.fields([{name:"profile",maxCount:1},{name:"cover",maxCount:1}]),updateUserData);
userRouter.post("/discover",protect,Discoverusers);
userRouter.post("/follow",protect,followUser);
userRouter.post("/unfollow",protect,unfollowUser)
userRouter.post("/connect",protect,sendConnectionRequest);
userRouter.post("/accept",protect,acceptConnectionRequest);
userRouter.post("/connections",protect,getUserConnections);

export default userRouter;