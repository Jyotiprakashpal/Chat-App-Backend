const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// REGISTER
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // ⚠ DO NOT HASH HERE - userSchema.pre('save' handles hashing
        const user = await User.create({
            username,
            email,
            password,
            plainPassword: password
        });

        // Generate and store token after user is created
        const token = generateToken(user._id);
        user.token = token;
        await user.save();

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: user.token,
            plainPassword: user.plainPassword
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        // 🔥 IMPORTANT FIX
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate and store token in database
        const token = generateToken(user._id);
        user.token = token;
        user.plainPassword = password;
        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: user.token,
            plainPassword: user.plainPassword
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// GET CURRENT USER
exports.getMe = async (req, res) => {
    res.json(req.user);
};
