const mongoose = require("mongoose");

const studentMenuSchema = new mongoose.Schema(
    {
        itemName: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        category: {
            type: String,
            required: true,
            enum: ["fastfood", "beverages", "snacks", "meals"]
        },

        image: {
            type: String,
            default: "https://via.placeholder.com/300x200?text=Food+Item"
        },

        isAvailable: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const StudentMenu = mongoose.model("StudentMenu", studentMenuSchema);

module.exports = StudentMenu;