const mongoose = require('mongoose');
const Admin = require('./modals/AdminSchema');

mongoose.connect('mongodb://127.0.0.1:27017/canteenApp')
    .then(async () => {
        await Admin.deleteMany({});
        await Admin.insertMany([
            { email: 'admin@canteen.com', password: 'admin123' },
            { email: 'manager@canteen.com', password: 'manager123' }
        ]);
        console.log('Admins seeded successfully!');
        process.exit();
    })
    .catch(err => {
        console.log('Error:', err);
        process.exit();
    });