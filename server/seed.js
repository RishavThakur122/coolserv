/**
 * CoolServ Database Seed Script
 * Run: node seed.js
 * Seeds demo admin, technicians, customers, and bookings
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User      = require('./models/User');
const Technician = require('./models/Technician');
const ACUnit    = require('./models/ACUnit');
const Booking   = require('./models/Booking');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coolserv';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([User.deleteMany(), Technician.deleteMany(), ACUnit.deleteMany(), Booking.deleteMany()]);
  console.log('🗑  Cleared existing data');

  // Admin
  const admin = await User.create({ firstName:'Super', lastName:'Admin', email:'admin@coolserv.in', passwordHash:'admin123', role:'admin', phone:'+91 98765 00001', city:'Delhi' });
  console.log('👤 Admin created:', admin.email);

  // Technicians
  const techData = [
    { firstName:'Rajesh', lastName:'Kumar', email:'tech@coolserv.in', phone:'+91 98765 11001', specs:['Maintenance','Repair','GasRefill'], exp:5, empId:'EMP001' },
    { firstName:'Sunil',  lastName:'Sharma', email:'sunil@coolserv.in', phone:'+91 98765 11002', specs:['Installation','Maintenance'],       exp:7, empId:'EMP002' },
    { firstName:'Amit',   lastName:'Singh',  email:'amit@coolserv.in',  phone:'+91 98765 11003', specs:['Repair','GasRefill'],               exp:3, empId:'EMP003' },
  ];
  const techs = [];
  for (const t of techData) {
    const u = await User.create({ firstName:t.firstName, lastName:t.lastName, email:t.email, passwordHash:'tech123', role:'technician', phone:t.phone });
    const tech = await Technician.create({ userId:u._id, specializations:t.specs, experience:t.exp, employeeId:t.empId, isAvailable:true });
    techs.push(tech);
    console.log(`👷 Technician: ${u.firstName} ${u.lastName}`);
  }

  // Customers
  const custData = [
    { firstName:'Priya',  lastName:'Mehta',   email:'customer@coolserv.in', phone:'+91 98765 22001', city:'Mumbai' },
    { firstName:'Arjun',  lastName:'Patel',   email:'arjun@coolserv.in',    phone:'+91 98765 22002', city:'Pune' },
    { firstName:'Sneha',  lastName:'Reddy',   email:'sneha@coolserv.in',    phone:'+91 98765 22003', city:'Bangalore' },
  ];
  const customers = [];
  for (const c of custData) {
    const u = await User.create({ ...c, passwordHash:'customer123', role:'customer' });
    customers.push(u);
    console.log(`👤 Customer: ${u.firstName} ${u.lastName}`);
  }

  // AC Units
  const units = [];
  for (const cust of customers) {
    const u1 = await ACUnit.create({ customerId:cust._id, brand:'Daikin', model:'5 Star Split 1.5T', installYear:2021, capacity:'1.5 Ton', acType:'Split', locationLabel:'Master Bedroom' });
    const u2 = await ACUnit.create({ customerId:cust._id, brand:'Voltas', model:'3 Star Window',     installYear:2019, capacity:'1 Ton',   acType:'Window', locationLabel:'Living Room' });
    units.push(u1, u2);
    console.log(`🌬  Units for ${cust.firstName}`);
  }

  // Bookings
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);

  await Booking.create({ customerId:customers[0]._id, unitId:units[0]._id, serviceType:'Maintenance', scheduledDate:tomorrow, timeSlot:'10:00–12:00', address:'Flat 4B, Marine Lines, Mumbai', estimatedAmount:800, status:'Pending' });
  await Booking.create({ customerId:customers[0]._id, technicianId:techs[0]._id, unitId:units[1]._id, serviceType:'Repair', scheduledDate:tomorrow, timeSlot:'14:00–16:00', address:'Flat 4B, Marine Lines, Mumbai', estimatedAmount:1200, status:'Assigned' });
  await Booking.create({ customerId:customers[1]._id, technicianId:techs[1]._id, unitId:units[2]._id, serviceType:'GasRefill', scheduledDate:nextWeek, timeSlot:'10:00–12:00', address:'101 Koregaon Park, Pune', estimatedAmount:1500, status:'InProgress' });
  const completed = await Booking.create({ customerId:customers[2]._id, technicianId:techs[0]._id, unitId:units[4]._id, serviceType:'Installation', scheduledDate:new Date(Date.now()-86400000*3), timeSlot:'08:00–10:00', address:'22 MG Road, Bangalore', estimatedAmount:2500, status:'Completed', completedAt:new Date(Date.now()-86400000*3+7200000), paymentStatus:'Paid', technicianNotes:'Installation complete. Tested cooling. Advised annual maintenance.' });

  console.log('📋 Bookings created');
  console.log('\n✅ Seed complete!\n');
  console.log('=== Demo Credentials ===');
  console.log('Admin:      admin@coolserv.in     / admin123');
  console.log('Customer:   customer@coolserv.in  / customer123');
  console.log('Technician: tech@coolserv.in      / tech123');
  console.log('========================\n');

  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
