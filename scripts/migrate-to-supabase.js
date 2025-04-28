// Script to migrate data from Firebase to Supabase
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { createClient } = require('@supabase/supabase-js');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCollection(collectionName, transformFn, tableName = null) {
  console.log(`Migrating ${collectionName}...`);
  
  // Get data from Firebase
  const snapshot = await getDocs(collection(firestore, collectionName));
  const items = [];
  
  snapshot.forEach((doc) => {
    items.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  console.log(`Found ${items.length} items in ${collectionName}`);
  
  // Transform data if needed
  const transformedItems = transformFn ? items.map(transformFn) : items;
  
  // Insert into Supabase
  const { data, error } = await supabase
    .from(tableName || collectionName)
    .insert(transformedItems);
  
  if (error) {
    console.error(`Error migrating ${collectionName}:`, error);
  } else {
    console.log(`Successfully migrated ${items.length} items to ${tableName || collectionName}`);
  }
}

// Transformation functions
const transformStaff = (item) => ({
  id: item.id,
  full_name: item.fullName,
  short_name: item.shortName,
  dob: item.dob,
  vietnam_id: item.vietnamId,
  license_number: item.licenseNumber,
  phone_number: item.phoneNumber,
  emergency_contact: item.emergencyContact,
  status: item.status || 'active',
  created_at: item.createdAt?.toDate?.() ? item.createdAt.toDate().toISOString() : new Date().toISOString(),
  updated_at: item.updatedAt?.toDate?.() ? item.updatedAt.toDate().toISOString() : new Date().toISOString()
});

const transformCustomers = (item) => ({
  id: item.id,
  representative_name: item.representativeName,
  company_name: item.companyName,
  contact_number: item.contactNumber,
  email: item.email,
  address: item.address,
  tax_number: item.taxNumber,
  google_drive_link: item.googleDriveLink,
  status: item.status || 'active',
  created_at: item.createdAt?.toDate?.() ? item.createdAt.toDate().toISOString() : new Date().toISOString(),
  updated_at: item.updatedAt?.toDate?.() ? item.updatedAt.toDate().toISOString() : new Date().toISOString()
});

const transformVehicles = (item) => ({
  id: item.id,
  license_number: item.licenseNumber,
  vehicle_type: item.vehicleType,
  brand: item.brand,
  model: item.model,
  year: item.year,
  registration_date: item.registrationDate,
  registration_expiry_date: item.registrationExpiryDate,
  insurance_expiry_date: item.insuranceExpiryDate,
  notes: item.notes,
  status: item.status || 'active',
  created_at: item.createdAt?.toDate?.() ? item.createdAt.toDate().toISOString() : new Date().toISOString(),
  updated_at: item.updatedAt?.toDate?.() ? item.updatedAt.toDate().toISOString() : new Date().toISOString()
});

const transformTrips = (item) => ({
  id: item.id,
  customer_id: item.customerId,
  vehicle_id: item.vehicleId,
  driver_id: item.driverId,
  assistant_id: item.assistantId,
  starting_point: item.startingPoint,
  ending_point: item.endingPoint,
  distance: item.distance,
  trip_date: item.tripDate,
  status: item.status || 'PENDING',
  price: item.price || 0,
  expenses: {
    police_fee: item.expenses?.policeFee || 0,
    toll_fee: item.expenses?.tollFee || 0,
    food_fee: item.expenses?.foodFee || 0,
    gas_money: item.expenses?.gasMoney || 0,
    mechanic_fee: item.expenses?.mechanicFee || 0
  },
  created_at: item.createdAt?.toDate?.() ? item.createdAt.toDate().toISOString() : new Date().toISOString(),
  updated_at: item.updatedAt?.toDate?.() ? item.updatedAt.toDate().toISOString() : new Date().toISOString()
});

// Run migrations
async function migrateAll() {
  try {
    await migrateCollection('staff', transformStaff);
    await migrateCollection('customers', transformCustomers);
    await migrateCollection('vehicles', transformVehicles);
    await migrateCollection('trips', transformTrips);
    
    // Add more collections as needed
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateAll();
