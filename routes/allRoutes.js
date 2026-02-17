const express = require('express');
const productRoutes = require('./productRoutes');
const userRoutes = require('./userRoutes');
const orderRoutes = require('./orderRoutes');

const allRoutes = express.Router();

// Use the routes here
allRoutes.use('/products', productRoutes);
allRoutes.use('/users', userRoutes);
allRoutes.use('/orders', orderRoutes);

module.exports = allRoutes;
