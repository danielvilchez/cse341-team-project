import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['customer', 'admin'],
    unique: true,
    required: true
  }
});

const role = mongoose.model('Role', roleSchema);
export default role;