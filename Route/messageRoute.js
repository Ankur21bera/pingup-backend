import express from 'express';
import { getChatMessages, sendMessage, sseControllers } from '../Controllers/messageController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../config/multer.js';

const messageRouter = express.Router();

messageRouter.get("/:userId",sseControllers);
messageRouter.post("/send",protect,upload.single("image"),protect,sendMessage);
messageRouter.post("/get",protect,getChatMessages);

export default messageRouter;