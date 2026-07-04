// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// --- Setup ---
const app = express();
app.use(cors());
app.use(express.json()); // FIX: Express 5 has this built in; body-parser dependency was redundant.

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quizapp';
const PORT = process.env.PORT || 3000;

// --- MongoDB Connection ---
// FIX: useNewUrlParser / useUnifiedTopology are no-ops in Mongoose 8+ and log
// deprecation warnings, so they've been removed.
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// --- Schema and Model ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stores a bcrypt hash, never plaintext
    score: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// Helper: strip the password hash before sending a user back to the client.
function toPublicUser(user) {
    return { name: user.name, email: user.email, score: user.score };
}

// --- Routes ---

// 🧾 Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // FIX: password is now hashed with bcrypt before storage. It was
        // previously saved and compared as plain text.
        const passwordHash = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: passwordHash });
        await user.save();
        res.status(201).json(toPublicUser(user));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Signup failed" });
    }
});

// 🔑 Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        // FIX: compare against the bcrypt hash instead of a plaintext string.
        const passwordMatches = user && await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        res.json(toPublicUser(user)); // FIX: password hash no longer sent to the client.
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Login failed" });
    }
});

// 🧮 Update Score
app.put('/api/score', async (req, res) => {
    try {
        const { email, score } = req.body;
        if (!email || typeof score !== 'number') {
            return res.status(400).json({ message: "Email and numeric score required" });
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Keep the highest score
        user.score = Math.max(user.score, score);
        await user.save();

        res.json({ message: "Score updated", user: toPublicUser(user) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Score update failed" });
    }
});

// 🏆 Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        // FIX: select only the fields the client needs, so password hashes
        // never leave the server.
        const users = await User.find().select('name email score').sort({ score: -1 });
        res.json(users.map(toPublicUser));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load leaderboard" });
    }
});

// --- Start Server ---
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
