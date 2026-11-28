import mongoose from "mongoose";

const ticketClassSchema = new mongoose.Schema(
    {
    	class:{
    		type: String,
    		required:[true, "class is required"],	
    	},
        name:{
            type: String,
            required:[true, "name is required"],    
        },
        pricePerKm:{
            type: Number,
            required:[true, "pricePerKm is required"],
            min:0,
        },
        amenities:{
            type: [String],
            required:[true, "amenities is required"]
        },
        description:{
        	type: String,
        	required: [true, "description is required"],
        },
        days:{
        	type:[String],
        	enum:["monday", "tuesday", "wednesday","thursday","friday", "saturday","sunday"]
        }
    }
);

const ticketClass = mongoose.model("ticketClass", ticketClassSchema, "ticketClasses");

export default ticketClass;
