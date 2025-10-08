// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// --- Setup ---
const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- MongoDB Connection ---
mongoose.connect('mongodb://127.0.0.1:27017/quizapps', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Error:", err));

// --- Schema and Model ---
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    score: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// --- Routes ---

// 🧾 Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ message: "All fields required" });

        const existing = await User.findOne({ email });
        if (existing)
            return res.status(400).json({ message: "Email already registered" });

        const user = new User({ name, email, password });
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Signup failed" });
    }
});

// 🔑 Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.password !== password)
            return res.status(400).json({ message: "Invalid credentials" });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Login failed" });
    }
});

// 🧮 Update Score
app.put('/api/score', async (req, res) => {
    try {
        const { email, score } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Keep the highest score
        user.score = Math.max(user.score, score);
        await user.save();

        res.json({ message: "Score updated", user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Score update failed" });
    }
});

// 🏆 Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await User.find().sort({ score: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Failed to load leaderboard" });
    }
});

// --- Start Server ---
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
