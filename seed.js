const StudentMenu = require("./modals/studentMenu");

const menuItems = [
    {
        itemName: "Cheesy Double Burger",
        description: "Juicy double patty burger with melted cheddar cheese, crisp lettuce, and special canteen mayo.",
        price: 120,
        category: "fastfood",
        image: "🍔",
        isAvailable: true
    },
    {
        itemName: "Personal Farmhouse Pizza",
        description: "Classic hand-tossed pizza topped with mozzarella cheese, green peppers, onion, and sweet corn.",
        price: 180,
        category: "fastfood",
        image: "🍕",
        isAvailable: true
    },
    {
        itemName: "Veg Hakka Noodles",
        description: "Stir-fried noodles tossed with fresh vegetables and spicy Indo-Chinese sauces.",
        price: 90,
        category: "fastfood",
        image: "🍜",
        isAvailable: true
    },
    {
        itemName: "Cold Coffee",
        description: "Chilled coffee blended with creamy milk, chocolate syrup, and ice.",
        price: 50,
        category: "beverages",
        image: "☕",
        isAvailable: true
    },
    {
        itemName: "Fresh Lime Soda",
        description: "Refreshing lemon soda served chilled with a sweet and salty balance.",
        price: 40,
        category: "beverages",
        image: "🥤",
        isAvailable: true
    },
    {
        itemName: "Masala Tea",
        description: "Hot Indian-style tea brewed with milk, ginger, and spices.",
        price: 15,
        category: "beverages",
        image: "🫖",
        isAvailable: true
    },
    {
        itemName: "Club Grill Sandwich",
        description: "Toasted bread layered with fresh vegetables, cheese, and mint chutney.",
        price: 80,
        category: "snacks",
        image: "🥪",
        isAvailable: true
    },
    {
        itemName: "Crispy Aloo Samosa",
        description: "Classic fried triangular pastry stuffed with spicy potato filling.",
        price: 20,
        category: "snacks",
        image: "https://vegecravings.com/wp-content/uploads/2017/03/Aloo-Samosa-Recipe-Step-By-Step-Instructions.jpg",
        isAvailable: true
    },
    {
        itemName: "French Fries",
        description: "Crispy golden potato fries served hot with ketchup.",
        price: 70,
        category: "snacks",
        image: "🍟",
        isAvailable: true
    },
    {
        itemName: "Veg Thali",
        description: "Complete meal with rice, roti, dal, sabzi, pickle, and salad.",
        price: 100,
        category: "meals",
        image: "🍱",
        isAvailable: true
    },
    {
        itemName: "Paneer Rice Bowl",
        description: "Steamed rice served with spicy paneer gravy and vegetables.",
        price: 130,
        category: "meals",
        image: "🍛",
        isAvailable: true
    },
    {
        itemName: "South Indian Meal",
        description: "Rice served with sambar, rasam, curd, papad, and vegetable curry.",
        price: 110,
        category: "meals",
        image: "🍚",
        isAvailable: true
    }
];

const seedMenuItems = async () => {
    try {
        const existingItems = await StudentMenu.find();

        if (existingItems.length > 0) {
            console.log("Menu items already exist. Seeding skipped.");
            return;
        }

        await StudentMenu.insertMany(menuItems);
        console.log("Menu items seeded successfully.");
    } catch (err) {
        console.log("Error while seeding menu items:", err);
    }
};





module.exports = seedMenuItems;