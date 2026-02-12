import fs from 'fs';
import imagekit from '../config/imagekit.js';
import Message from '../models/Message.js';




const connections = {}; // userId -> res

export const sseControllers = (req, res) => {
  const { userId } = req.params;

  console.log("New Client connected:", userId);

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // VERY IMPORTANT (buffering off)
  res.flushHeaders?.();

  // Save connection
  connections[userId] = res;

  // Send connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  // Keep alive ping (important)
  const keepAlive = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    delete connections[userId];
    console.log("Client Disconnected:", userId);
  });
};

export { connections };

export const sendMessage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { to_user_id, text } = req.body;
    const image = req.file;

    let media_url = "";
    const message_type = image ? "image" : "text";

    // Upload image if exists
    if (image) {
      const fileBuffer = fs.readFileSync(image.path);

      const response = await imagekit.upload({
        file: fileBuffer,
        fileName: image.originalname,
      });

      media_url = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: "1280" },
        ],
      });

   
      fs.unlinkSync(image.path);
    }

 
    const message = await Message.create({
      from_user_id: userId,
      to_user_id,
      text: message_type === "text" ? text : "",
      message_type,
      media_url,
    });

   
    const messageWithUserData = await Message.findById(message._id).populate(
      "from_user_id"
    );

  
    if (connections[to_user_id]) {
      connections[to_user_id].write(
        `event: message\ndata: ${JSON.stringify(messageWithUserData)}\n\n`
      );
    }

  
    return res.json({ success: true, message: messageWithUserData });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export const getChatMessages = async(req,res) => {
    try {
        const {userId} = req.auth();
        const {to_user_id} = req.body;
        const messages = await Message.find({
            $or:[
                {from_user_id:userId,to_user_id},
                {from_user_id:to_user_id,to_user_id:userId}
            ]
        }).sort({created_at:-1})
        await Message.updateMany({from_user_id:to_user_id,to_user_id:userId},{seen:true})
        res.json({success:true,messages})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const getUserRecentMessages = async(req,res) => {
    try {
        const {userId} = req.auth();
        const messages = (await Message.find({to_user_id:userId}).populate("from_user_id to_user_id")).sort({created_at:-1})
        res.json({success:true,messages})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}