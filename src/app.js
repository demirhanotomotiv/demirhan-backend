const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Route'ları dahil et
const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/user');
const healthRoutes = require('./routes/health');
app.use('/', indexRoutes);
app.use('/user', userRoutes);
app.use('/health', healthRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});