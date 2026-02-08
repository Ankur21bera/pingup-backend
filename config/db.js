import mongoose from "mongoose";

const connectDb = async () => {
    try {
        mongoose.connection.on("connected",()=>console.log("Db Is Connected"));
        await mongoose.connect(`${process.env.MONGODB_URI}/ping-up`)
    } catch (error) {
        console.log(error.message)
    }
}

export default connectDb;