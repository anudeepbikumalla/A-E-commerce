const Order = require('../models/Order');
const Product = require('../models/Product');
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
  try {
    const { products, shippingAddress } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one product'
      });
    }

    const user = req.user._id;
    let totalAmount = 0;
    const orderProducts = [];

    const productIds = [...new Set(products.map((item) => String(item.product)))];
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(dbProducts.map((product) => [String(product._id), product]));

    for (const item of products) {
      // Validate quantity for each product line.
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each product must have a valid quantity'
        });
      }

      const product = productMap.get(String(item.product));
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`
        });
      }

      // Save price snapshot in order to keep history stable.
      totalAmount += product.price * item.quantity;
      orderProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    const order = new Order({
      user,
      products: orderProducts,
      totalAmount,
      shippingAddress
    });

    const savedOrder = await order.save();
    await savedOrder.populate('user', '-password');
    await savedOrder.populate('products.product');

    res.status(201).json({
      success: true,
      data: savedOrder,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
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

    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
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
      { new: true, runValidators: true }
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
