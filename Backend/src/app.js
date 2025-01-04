require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
// app.use('/api/auth', authRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});