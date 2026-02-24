const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { hasPermission, hasAnyPermission } = require('../utils/rbac');

// Get orders list.
// Admin/root can view all orders. Other users can view only their own orders.
exports.getAllOrders = async (req, res) => {
  try {
    const canReadAllOrders = hasAnyPermission(req.user.role, ['read_orders', 'manage_orders']);
    const filter = canReadAllOrders ? {} : { user: req.user._id };
    const orders = await Order.find(filter)
      .populate('user', '-password')
      .populate('products.product');

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get one order by id.
// Non-admin users are allowed only when they own the order.
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', '-password')
      .populate('products.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const canReadAllOrders = hasAnyPermission(req.user.role, ['read_orders', 'manage_orders']);
    if (!canReadAllOrders && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a new order.
// Total amount is calculated from current product prices in the database.
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { products, shippingAddress } = req.body;
    const user = req.user._id;
    let totalAmount = 0;
    const orderProducts = [];
    let createdOrderId = null;

    await session.withTransaction(async () => {
      const requestedQtyByProduct = new Map();
      for (const item of products) {
        const key = String(item.product);
        requestedQtyByProduct.set(key, (requestedQtyByProduct.get(key) || 0) + item.quantity);
      }

      const productIds = [...requestedQtyByProduct.keys()];
      const dbProducts = await Product.find({ _id: { $in: productIds } }).session(session);
      const productMap = new Map(dbProducts.map((product) => [String(product._id), product]));

      for (const [productId, totalRequestedQty] of requestedQtyByProduct.entries()) {
        const existing = productMap.get(productId);
        if (!existing) {
          throw Object.assign(new Error(`Product ${productId} not found`), { statusCode: 404 });
        }

        const updated = await Product.findOneAndUpdate(
          { _id: productId, stock: { $gte: totalRequestedQty } },
          { $inc: { stock: -totalRequestedQty } },
          { returnDocument: 'before', session }
        );
        if (!updated) {
          throw Object.assign(
            new Error(`Insufficient stock for product ${productId}`),
            { statusCode: 409 }
          );
        }
      }

      for (const item of products) {
        const product = productMap.get(String(item.product));
        totalAmount += product.price * item.quantity;
        orderProducts.push({
          product: product._id,
          quantity: item.quantity,
          price: product.price
        });
      }

      const [saved] = await Order.create([{
        user,
        products: orderProducts,
        totalAmount,
        shippingAddress
      }], { session });
      createdOrderId = saved._id;
    });

    const savedOrder = await Order.findById(createdOrderId);
    await savedOrder.populate('user', '-password');
    await savedOrder.populate('products.product');

    res.status(201).json({
      success: true,
      data: savedOrder,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  } finally {
    await session.endSession();
  }
};

// Full order update.
// Only manager/admin/superuser/root can edit full order fields.
exports.updateOrder = async (req, res) => {
  try {
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!hasPermission(req.user.role, 'manage_orders')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot modify this order'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    )
      .populate('user', '-password')
      .populate('products.product');

    res.status(200).json({ success: true, data: order, message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete an order.
// Admin/root can delete any order; other users can delete only their own order.
exports.deleteOrder = async (req, res) => {
  try {
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const canManageOrders = hasPermission(req.user.role, 'manage_orders');
    if (!canManageOrders && existingOrder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update only order status.
// This endpoint protects other fields from accidental updates.
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // Delivery users can mark only "delivered".
    if (req.user.role === 'delivery' && status !== 'delivered') {
      return res.status(403).json({
        success: false,
        message: 'Delivery staff can only mark orders as "delivered"!'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after', runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      data: order,
      message: `Order status updated to ${status} successfully`
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
