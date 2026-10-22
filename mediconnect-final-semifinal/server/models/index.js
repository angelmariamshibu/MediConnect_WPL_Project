const mongoose = require("mongoose");
const jsonPlugin = require("./plugin");
const { Schema } = mongoose;

mongoose.plugin(jsonPlugin);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* Reference data: readable string ids (e.g. "D001", "dermatology") are used as _id */
const Specialty = mongoose.model("Specialty", new Schema({
  _id: String,
  name: { type: String, required: true },
  icon: String,
  summary: String,
  description: String,
  image: String 
}, { timestamps: true }));

const Doctor = mongoose.model("Doctor", new Schema({
  _id: String,
  name: { type: String, required: true },
  specialtyId: { type: String, ref: "Specialty", required: true, index: true },
  experience: { type: Number, min: 0 },
  days: [{ type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }],
  qualification: String,
  about: String,
  photo: String // path under /img/doctors, e.g. "img/doctors/D001.png"
}, { timestamps: true }));

const Medicine = mongoose.model("Medicine", new Schema({
  _id: String,
  name: { type: String, required: true },
  category: String,
  price: { type: Number, required: true, min: 0 },
  rx: { type: Boolean, default: false },
  image: String // path under /img/medicines, e.g. "img/medicines/M1.svg"
}, { timestamps: true }));

const Package = mongoose.model("Package", new Schema({
  _id: String,
  name: { type: String, required: true },
  includes: String,
  price: { type: Number, required: true, min: 0 },
  image: String // path under /img/checkups, e.g. "img/checkups/PKG1.svg"
}, { timestamps: true }));

/* Users */
const User = mongoose.model("User", new Schema({
  memberId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
 /* phone: { type: String, required: true, unique: true, match: /^[0-9]{10}$/ },*/
 phone: { type: String, required: true, unique: true, match: [/^[6-9][0-9]{9}$/, "Please enter a valid mobile number."] },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  address: { type: String, trim: true, maxlength: 300 },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true }));

/* Patient records */
const Report = mongoose.model("Report", new Schema({
  memberId: { type: String, required: true, uppercase: true, index: true },
  reportId: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, required: true },
  date: { type: String, match: DATE_RE },
  doctor: String,
  summary: String,
  status: { type: String, enum: ["Pending", "Final"], default: "Final" }
}, { timestamps: true }));

const Bill = mongoose.model("Bill", new Schema({
  memberId: { type: String, required: true, uppercase: true, index: true },
  billId: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Paid", "Unpaid"], default: "Unpaid" },
  date: { type: String, match: DATE_RE },
  paidAt: Date,
  // Links a bill to the order / checkup booking that produced it (makes bill creation idempotent).
  refId: { type: String, unique: true, sparse: true }
}, { timestamps: true }));

/* Transactions */
const Appointment = mongoose.model("Appointment", new Schema({
  ref: { type: String, required: true, unique: true },
  memberId: { type: String, required: true, uppercase: true, index: true },
  doctorId: { type: String, ref: "Doctor", required: true, index: true },
  date: { type: String, required: true, match: DATE_RE },
  time: { type: String, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ["Requested", "Confirmed", "Cancelled", "Completed"], default: "Requested" }
}, { timestamps: true }));

// Prevent two bookings for the same doctor/date/slot (cancelled ones free the slot).
Appointment.schema.index(
  { doctorId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["Requested", "Confirmed"] } } }
);

const Order = mongoose.model("Order", new Schema({
  orderId: { type: String, required: true, unique: true },
  memberId: { type: String, required: true, uppercase: true, index: true },
  items: [{
    _id: false,
    medicineId: { type: String, ref: "Medicine", required: true },
    name: String,
    unitPrice: Number,
    qty: { type: Number, min: 1, max: 20 },
    rx: Boolean
  }],
  total: { type: Number, required: true, min: 0 },
  needsPrescriptionCheck: { type: Boolean, default: false },
  status: { type: String, enum: ["Placed", "Dispatched", "Delivered", "Cancelled"], default: "Placed" }
}, { timestamps: true }));

const CheckupBooking = mongoose.model("CheckupBooking", new Schema({
  bookingId: { type: String, required: true, unique: true },
  memberId: { type: String, required: true, uppercase: true, index: true },
  packageId: { type: String, ref: "Package", required: true },
  packageName: String,
  price: Number,
  status: { type: String, enum: ["Booked", "Sample collected", "Completed", "Cancelled"], default: "Booked" }
}, { timestamps: true }));

/* Atomic counter used to hand out Member IDs (MC10235, MC10236, ...) */
const Counter = mongoose.model("Counter", new Schema({
  _id: String,
  seq: { type: Number, default: 0 }
}));

// Member IDs are "MC10" + seq, so seq 235 -> MC10235 (matches the original demo numbering).
const MEMBER_SEQ_START = 234; // first new member gets 235

async function ensureCounters() {
  await Counter.updateOne(
    { _id: "member" },
    { $setOnInsert: { seq: MEMBER_SEQ_START } },
    { upsert: true }
  );
}

async function nextSeq(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return doc.seq;
}

module.exports = {
  Specialty, Doctor, Medicine, Package, User, Report, Bill,
  Appointment, Order, CheckupBooking, Counter, nextSeq, ensureCounters, MEMBER_SEQ_START
};
