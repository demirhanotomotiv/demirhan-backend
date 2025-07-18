const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db');
const app = express();

// Pool'u app.locals'a ekle
app.locals.pool = pool;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ulasapp.site',
    'http://localhost:3001',
    'https://ulasserver-production.up.railway.app', // backend domaini
    'https://ulasapp.site' // frontend domaini (örnek)
  ],
  credentials: true
}));

app.use(express.json());

// Route'ları dahil et
const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/user');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const transactionCategoriesRoutes = require('./routes/transactionCategories');
const vehiclesRoutes = require('./routes/vehicles');
const personnelRoutes = require('./routes/personnel');
const transactionsRoutes = require('./routes/transactions');
const activitiesRoutes = require('./routes/activities');

app.use('/', indexRoutes);
app.use('/user', userRoutes);
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/transaction-categories', transactionCategoriesRoutes);
app.use('/vehicles', vehiclesRoutes);
app.use('/personnel', personnelRoutes);
app.use('/transactions', transactionsRoutes);  
app.use('/activities', activitiesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});