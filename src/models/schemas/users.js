import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true 
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    role: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Role', 
      required: true 
    }
  },
  { timestamps: true }
);

userSchema.index({ name: 'text', username: 'text', email: 'text' });

const user = mongoose.model('User', userSchema);
export default user;