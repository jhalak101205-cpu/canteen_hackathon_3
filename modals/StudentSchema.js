const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    clerkId: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        default: ""
    },

    email: {
        type: String,
        default: ""
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Student", studentSchema);