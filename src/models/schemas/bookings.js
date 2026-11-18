import mongoose from 'mongoose';

const passengerSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            },
            message: 'Please enter a valid email address'
        }
    }
});

const bookingSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        scheduleId: {
            type: String,
            required: true,
            trim: true,
        },
        tripId: {
            type: String,
            required: true,
            trim: true,
        },
        ticketClass: {
            type: String,
            required: true,
            trim: true,
            enum: {
                values: ['standard', 'premium', 'first'],
                message: '{VALUE} is not a supported status'
            }
        },
        selectedDay: {
            type: String,
            required: true,
            trim: true,
            enum: {
                values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                message: '{VALUE} is not a supported status'
            }
        },
        passengers: {
            type: [passengerSchema],
            required: true,
            validate: {
                validator: function(passengers) {
                    return passengers.length > 0 && passengers.length <= 8;
                },
                message: 'At least one passenger is required and maximum 8 passengers allowed'
            }
        }
    },
    {
        timestamps: true,
    }
);

const booking = mongoose.model('Booking', bookingSchema);

export default booking;