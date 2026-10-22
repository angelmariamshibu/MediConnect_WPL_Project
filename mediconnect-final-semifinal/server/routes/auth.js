const express = require("express");
const bcrypt = require("bcryptjs");
const { User, nextSeq } = require("../models");
const { issueSession, clearSession, optionalAuth } = require("../middleware/auth");
const { HttpError, str } = require("../middleware/errors");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Used to keep login timing similar whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

router.post("/register", async (req, res) => {
  const name = str(req.body.name, 100);
  /*const phone = str(req.body.phone, 20);*/
  const phone = str(req.body.phone, 20).replace(/[\s-]/g, "").replace(/^(\+91)(?=[6-9]\d{9}$)/, "");
  const email = str(req.body.email, 254).toLowerCase();
  const address = str(req.body.address, 300);
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!name) throw new HttpError(400, "Please enter your full name.");
  /*if (!/^[0-9]{10}$/.test(phone)) throw new HttpError(400, "Please enter a valid 10-digit phone number.");*/
  if (!/^[6-9][0-9]{9}$/.test(phone)) throw new HttpError(400, "Please enter a valid Indian mobile number (+91).");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Please enter a valid email address.");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters long.");
  if (password.length > 128) throw new HttpError(400, "Password is too long.");

  if (await User.exists({ email })) throw new HttpError(409, "An account already exists with this email address.");
  if (await User.exists({ phone })) throw new HttpError(409, "An account already exists with this phone number.");

  const memberId = "MC10" + (await nextSeq("member"));
  let user;
  try {
    user = await User.create({
      memberId, name, phone, email, address,
      passwordHash: await bcrypt.hash(password, 10)
    });
  } catch (err) {
    // Lost a race with a concurrent registration - report which field clashed.
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      if (field === "email") throw new HttpError(409, "An account already exists with this email address.");
      if (field === "phone") throw new HttpError(409, "An account already exists with this phone number.");
    }
    throw err;
  }

  issueSession(res, user);
  res.status(201).json({ user });
});

router.post("/login", async (req, res) => {
  const identifier = str(req.body.identifier, 254);
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const fail = () => new HttpError(401, "We couldn't match that phone, email or Member ID with that password. Please try again.");
  if (!identifier || !password) throw fail();

  const user = await User.findOne({
    $or: [
      { memberId: identifier.toUpperCase() },
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  }).select("+passwordHash");

  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw fail();

  issueSession(res, user);
  res.json({ user });
});

router.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// Always 200: `user` is null when nobody is logged in, so the nav can render quietly.
router.get("/me", optionalAuth, (req, res) => {
  res.json({ user: req.user || null });
});

module.exports = router;
