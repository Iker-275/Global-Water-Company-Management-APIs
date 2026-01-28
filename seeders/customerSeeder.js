// const Customer = require("../models/customerModel");
// const mongoose = require("mongoose");
// const { generateCustomerCode } = require("../utils/generateCustomerCode");


// const names = [
//   "OKOLO", "FATUMA HASSAN", "MOHAMED ADAN",
//   "IBRAHIM NOOR", "AISHA MOHAMED", "OMAR SALAD", "KHADAR YUSUF",
//   "HALIMA ABDI", "ABDULLAH HUSSEIN"
// ];

// function randomName(i) {
//   return names[i % names.length] + " " + (i + 1);
// }

// async function seedCustomers() {
//    const  zoned = "6968afda4fd39f54d463078e";
//    const villaged ="6968b3be61ad8946c6162861";

//    const customerCode = await generateCustomerCode(
//     "vilHALWADAAG",
//        "z002",
       
//      );

//   const existing = await Customer.countDocuments({
//     zoneId: zoned,
//     villageId: villaged
//   });

//   if (existing >= 30) {
//     console.log("⚠️ Customers already seeded");
//     return;
//   }

//   const customers = [];

//   for (let i = 1; i <= 30; i++) {
//     customers.push({
//       houseNo: `AX${String(i).padStart(3, "0")}`,
//       phone: `358${String(200 + i)}`,
//       zoneCode: "z002",
//       zoneId: zoned,
//       name: randomName(i),
//       purpose: "domestic",
//       businessName: "",
//       villageId: villaged,
//       villageName: "HORSEED",
//       collectorId: new mongoose.Types.ObjectId("6968a3ddcc13bd29d4b09c24"),
//       collectorName: "admin",
//       customerCode,
//       meter: {
//         meterNo: `MTR-$"z002"-${i}`,
//         initialReading: 0,
//         currentReading: 0,
//         readings: []
//       },
//       balances: {
//         previousBalance: 0,
//         expectedTotal: 0,
//         totalPaid: 0,
//         unpaid: 0
//       },
//       visitIds: [],
//       paymentIds: [],
//       status: "active"
//     });
//   }

//   await Customer.insertMany(customers);
//   console.log("✅ 30 customers seeded");
// }




// async function runSeed() {
//   try {
    
//     await seedCustomers();

//     console.log("🎉 Seeding complete");
//     process.exit(0);
//   } catch (err) {
//     console.error("❌ Seeding failed", err);
//     process.exit(1);
//   }
// }



// module.exports = {seedCustomers,runSeed};

const Customer = require("../models/customerModel");
const mongoose = require("mongoose");
const { generateCustomerCode } = require("../utils/generateCustomerCode");

/**
 * 30 UNIQUE NAMES
 */
const names = [
  "OKOLO ABDI",
  "FATUMA HASSAN",
  "MOHAMED ADAN",
  "IBRAHIM NOOR",
  "AISHA MOHAMED",
  "OMAR SALAD",
  "KHADAR YUSUF",
  "HALIMA ABDI",
  "ABDULLAH HUSSEIN",
  "SAID MOHAMUD",
  "AMINA ALI",
  "YUSUF ABDIRAHMAN",
  "HODAN NUR",
  "ABDIKARIM SHIRE",
  "RAHMA ISMAIL",
  "SALMAN AHMED",
  "MARYAN OSMAN",
  "HASSAN JAMA",
  "SADIA MOHAMED",
  "BASHIR ADAN",
  "NAIMA ABDI",
  "MOHAMUD ALI",
  "KHADIJA YUSUF",
  "IBRAHIM HASSAN",
  "MUNA SHIRE",
  "NUR MOHAMED",
  "HAMZA SALAD",
  "FAIZA ADAN",
  "ABDIRASHID NOOR",
  "ZAHRA HUSSEIN"
];

async function seedCustomers() {
  const zoneId = new mongoose.Types.ObjectId("6968afda4fd39f54d463078e");
  const villageId = new mongoose.Types.ObjectId("6968b3be61ad8946c6162861");

  const existingCount = await Customer.countDocuments({
    zoneId,
    villageId
  });

  if (existingCount >= 30) {
    console.log("⚠️ Customers already seeded for this zone & village");
    return;
  }

  const customers = [];

  for (let i = 0; i < 30; i++) {
    // ✅ unique phone per customer
    const phone = `3587${String(1000 + i)}`;

    // ✅ unique customer code PER customer
    const customerCode = await generateCustomerCode(
      "vilHALWADAAG",
      "z002"
    );

    customers.push({
      houseNo: `AX${String(i + 1).padStart(3, "0")}`,
      phone,
      zoneCode: "z002",
      zoneId,
      name: names[i],
      purpose: "domestic",
      businessName: "",
      villageId,
      villageName: "HORSEED",
      collectorId: new mongoose.Types.ObjectId("6968a3ddcc13bd29d4b09c24"),
      collectorName: "admin",
      customerCode,
      meter: {
        meterNo: `MTR-z002-${i + 1}`, // ✅ fixed
        initialReading: 0,
        currentReading: 0,
        readings: []
      },
      balances: {
        previousBalance: 0,
        expectedTotal: 0,
        totalPaid: 0,
        unpaid: 0
      },
      visitIds: [],
      paymentIds: [],
      status: "active"
    });
  }

  await Customer.insertMany(customers);
  console.log("✅ 30 unique customers seeded successfully");
}

async function runSeed() {
  try {
    await seedCustomers();
    console.log("🎉 Seeding complete");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed", err);
    process.exit(1);
  }
}

module.exports = { seedCustomers, runSeed };
