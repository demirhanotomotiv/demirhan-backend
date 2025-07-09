const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://your-frontend-domain.com', 'https://ulas-frontend.vercel.app', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Route'ları dahil et
const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/user');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');

app.use('/', indexRoutes);
app.use('/user', userRoutes);
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);  

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});