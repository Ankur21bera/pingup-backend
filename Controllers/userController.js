
import imagekit from "../config/imagekit.js";
import { inngest } from "../inngest/index.js";
import Connection from "../models/connectionSchema.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import fs from 'fs';


export const getUserData = async(req,res)=>{
    try {
        const {userId} = req.auth();
        const user = await User.findById(userId)
        if(!user){
            return res.json({success:false,message:"User Not Found"})
        }
        res.json({success:true,user})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const updateUserData = async (req, res) => {
  try {
    const { userId } = req.auth();

    let { username, bio, location, full_name } = req.body;

    // Find user (support clerkId or mongo _id)
    let tempUser =
      (await User.findOne({ clerkId: userId })) || (await User.findById(userId));

    if (!tempUser) {
      return res.json({ success: false, message: "User not found" });
    }

    // If username not provided, keep old
    if (!username) username = tempUser.username;

    // If username changed, check uniqueness
    if (tempUser.username !== username) {
      const existingUser = await User.findOne({ username });

      // If username already taken, revert
      if (existingUser) {
        username = tempUser.username;
      }
    }

    const updateData = {
      username,
      bio: bio || tempUser.bio,
      location: location || tempUser.location,
      full_name: full_name || tempUser.full_name,
    };

    const profile = req.files?.profile?.[0];
    const cover = req.files?.cover?.[0];

    // Upload profile picture
    if (profile) {
      const buffer = fs.readFileSync(profile.path);

      const response = await imagekit.upload({
        file: buffer,
        fileName: profile.originalname,
      });

      const url = imagekit.url({
        path: response.filePath,
        transformation: [{ quality: "auto" }, { format: "webp" }, { width: "512" }],
      });

      updateData.profile_picture = url;
    }

    if (cover) {
      const buffer = fs.readFileSync(cover.path);

      const response = await imagekit.upload({
        file: buffer,
        fileName: cover.originalname,
      });

      const url = imagekit.url({
        path: response.filePath,
        transformation: [{ quality: "auto" }, { format: "webp" }, { width: "1280" }],
      });

      updateData.cover_picture = url;
    }

   
    const updatedUser = await User.findByIdAndUpdate(tempUser._id, updateData, {
      new: true,
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log("updateUserData error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const Discoverusers = async (req,res) => {
    try {
        const {userId} = req.auth();
        const {input} = req.body;
        const allUsers = await User.find(
            {
                $or:[
                    {username: new RegExp(input,"i")},
                    {email: new RegExp(input,"i")},
                    {full_name: new RegExp(input,"i")},
                    {location: new RegExp(input,"i")}
                ]
            }
        )

        const filteredUsers = allUsers.filter(user=>user._id !== userId);
        res.json({success:true,users:filteredUsers})

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const followUser = async (req,res) => {
    try {
        const {userId} = req.auth();
        const {id} = req.body;
        const user = await User.findById(userId);
        if(user.following.includes(id)){
            return res.json({success:false,message:"You Are Already Following This User"})
        }

        user.following.push(id);
        await user.save();

        const toUser = await User.findById(id)
        toUser.followers.push(userId);
        await toUser.save()

        res.json({success:true,message:"Now You Are Following These User"})

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const unfollowUser = async(req,res) => {
    try {
        const {userId} = req.auth();
        const {id} = req.body;

        const user = await User.findById(userId)
        user.following = user.following.filter(user => user !== id);
        await user.save();

        const toUser = await User.findById(id)
        toUser.followers = toUser.followers.filter(user => user !== userId);
        await toUser.save();

        res.json({success:true,message:"You Are No Longer Following These User"})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: "User id is required" });
    }

    if (id === userId) {
      return res.json({ success: false, message: "You cannot connect with yourself" });
    }

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // ✅ use createdAt (recommended)
    const connectionRequests = await Connection.find({
      from_user_id: userId,
      createdAt: { $gt: last24Hours },
    });

    if (connectionRequests.length >= 20) {
      return res.json({
        success: false,
        message: "You have sent more than 20 connection requests in the last 24 hours",
      });
    }

    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });

    if (!connection) {
      // ✅ store created connection
      const newConnection = await Connection.create({
        from_user_id: userId,
        to_user_id: id,
      });

      // ✅ trigger inngest event
      await inngest.send({
        name: "app/connection-request",
        data: { connectionId: newConnection._id.toString() },
      });

      return res.json({
        success: true,
        message: "Connection Request Sent Successfully",
      });
    }

    if (connection.status === "accepted") {
      return res.json({
        success: false,
        message: "You are already connected with this user",
      });
    }

    return res.json({ success: false, message: "Connection Request Pending" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getUserConnections = async(req,res) => {
    try {
        const {userId} = req.auth();
        const user = await User.findById(userId).populate("connections followers following")
        const connections = user.connections;
        const followers = user.followers;
        const following = user.following;

        const pendingConnections = (await Connection.find({to_user_id:userId,status:"pending"}).populate("from_user_id")).map(connection=>connection.from_user_id)
        res.json({success:true,connections,followers,following,pendingConnections})
     } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const acceptConnectionRequest = async(req,res) => {
    try {
        const {userId} = req.auth();
        const {id} = req.body;
        const connection = await Connection.findOne({from_user_id:id,to_user_id:userId})
        if(!connection){
            return res.json({success:false,message:"Connection Is Not Found"})
        }

        const user = await User.findById(userId);
        user.connections.push(id);
        await user.save();

        const toUser = await User.findById(id);
        toUser.connections.push(userId);
        await toUser.save();

        connection.status = "accepted";
        await connection.save();

        res.json({success:true,message:"Connection Accepted Successfully"})

    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}

export const getUserProfiles = async(req,res) => {
    try {
        const {profileId} = req.body;
        const profile = await User.findById(profileId)
        if(!profile){
            return res.json({success:false,message:"Profile Not Found"})
        }
        const posts = await Post.find({user:profileId}).populate("user")
        res.json({success:true,posts})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:error.message})
    }
}