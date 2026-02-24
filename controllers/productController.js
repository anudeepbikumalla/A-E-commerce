const Product = require('../models/Product');
const { hasPermission } = require('../utils/rbac');

// Get all products.
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get one product by id.
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a product.
// We store both createdBy and updatedBy for audit history.
exports.createProduct = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id
    };
    const product = new Product(payload);
    const savedProduct = await product.save();
    res.status(201).json({
      success: true,
      data: savedProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// Update a product.
// Owner can edit their product. Elevated roles can edit any product.
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Authorization check: owner OR elevated role.
    const isOwner = product.createdBy.toString() === req.user._id.toString();
    const hasSuperPower = hasPermission(req.user.role, 'manage_products');

    if (!isOwner && !hasSuperPower) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only edit products you have created!' });
    }

    // Prevent changing original owner through update payload.
    if (req.body.createdBy) delete req.body.createdBy;
    req.body.updatedBy = req.user._id;

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: updatedProduct, message: 'Product updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a product.
// Owner can delete their product. Elevated roles can delete any product.
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Authorization check: owner OR elevated role.
    const isOwner = product.createdBy.toString() === req.user._id.toString();
    const hasSuperPower = hasPermission(req.user.role, 'manage_products');

    if (!isOwner && !hasSuperPower) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot delete products from other vendors!' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
