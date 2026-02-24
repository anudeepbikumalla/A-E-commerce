const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../models/User');
const app = require('../server');

const baseHeaders = { 'Content-Type': 'application/json' };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(baseUrl, method, path, { token, body } = {}) {
  const headers = { ...baseHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

async function waitForMongo() {
  for (let i = 0; i < 50; i += 1) {
    if (mongoose.connection.readyState === 1) return;
    await sleep(200);
  }
  throw new Error('Mongo connection did not become ready in time.');
}

async function upsertUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) user = new User({ name, email, password, role });
  user.name = name;
  user.password = password;
  user.role = role;
  await user.save();
}

test('RBAC integration smoke', async (t) => {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const unique = Date.now();

  await waitForMongo();

  await upsertUser({ name: 'Admin User', email: 'admin@example.com', password: 'AdminPass123!', role: 'admin' });
  await upsertUser({ name: 'Manager User', email: 'manager@example.com', password: 'ManagerPass123!', role: 'manager' });
  await upsertUser({ name: 'Delivery User', email: 'delivery@example.com', password: 'DeliveryPass123!', role: 'delivery' });

  const user1Email = `user-${unique}@example.com`;
  const user2Email = `user2-${unique}@example.com`;

  const create1 = await request(baseUrl, 'POST', '/users', {
    body: { name: 'User One', email: user1Email, password: 'Password123!' }
  });
  assert.equal(create1.status, 201);

  const create2 = await request(baseUrl, 'POST', '/users', {
    body: { name: 'User Two', email: user2Email, password: 'Password123!' }
  });
  assert.equal(create2.status, 201);

  const loginUser1 = await request(baseUrl, 'POST', '/users/login', {
    body: { email: user1Email, password: 'Password123!' }
  });
  assert.equal(loginUser1.status, 200);

  const loginUser2 = await request(baseUrl, 'POST', '/users/login', {
    body: { email: user2Email, password: 'Password123!' }
  });
  assert.equal(loginUser2.status, 200);

  const loginAdmin = await request(baseUrl, 'POST', '/users/login', {
    body: { email: 'admin@example.com', password: 'AdminPass123!' }
  });
  assert.equal(loginAdmin.status, 200);

  const loginManager = await request(baseUrl, 'POST', '/users/login', {
    body: { email: 'manager@example.com', password: 'ManagerPass123!' }
  });
  assert.equal(loginManager.status, 200);

  const loginDelivery = await request(baseUrl, 'POST', '/users/login', {
    body: { email: 'delivery@example.com', password: 'DeliveryPass123!' }
  });
  assert.equal(loginDelivery.status, 200);

  const userToken = loginUser1.data.token;
  const user2Id = loginUser2.data.user.id;
  const userId = loginUser1.data.user.id;
  const adminToken = loginAdmin.data.token;
  const managerToken = loginManager.data.token;
  const deliveryToken = loginDelivery.data.token;

  const ownRead = await request(baseUrl, 'GET', `/users/${userId}`, { token: userToken });
  assert.equal(ownRead.status, 200);

  const otherReadByUser = await request(baseUrl, 'GET', `/users/${user2Id}`, { token: userToken });
  assert.equal(otherReadByUser.status, 403);

  const otherReadByAdmin = await request(baseUrl, 'GET', `/users/${user2Id}`, { token: adminToken });
  assert.equal(otherReadByAdmin.status, 200);

  const productCreate = await request(baseUrl, 'POST', '/products', {
    token: managerToken,
    body: {
      name: `Integration Product ${unique}`,
      price: 250,
      category: 'test',
      stock: 10,
      description: 'integration test product'
    }
  });
  assert.equal(productCreate.status, 201);
  const productId = productCreate.data.data._id;

  const updateByUser = await request(baseUrl, 'PUT', `/products/${productId}`, {
    token: userToken,
    body: { name: 'should-fail' }
  });
  assert.equal(updateByUser.status, 403);

  const createOrder = await request(baseUrl, 'POST', '/orders', {
    token: userToken,
    body: {
      products: [{ product: productId, quantity: 1 }],
      shippingAddress: 'Integration Street 1'
    }
  });
  assert.equal(createOrder.status, 201);
  const orderId = createOrder.data.data._id;

  const deliveryShipped = await request(baseUrl, 'PUT', `/orders/${orderId}/status`, {
    token: deliveryToken,
    body: { status: 'shipped' }
  });
  assert.equal(deliveryShipped.status, 403);

  const deliveryDelivered = await request(baseUrl, 'PUT', `/orders/${orderId}/status`, {
    token: deliveryToken,
    body: { status: 'delivered' }
  });
  assert.equal(deliveryDelivered.status, 200);

  const managerOrders = await request(baseUrl, 'GET', '/orders', { token: managerToken });
  assert.equal(managerOrders.status, 200);

  const adminOrders = await request(baseUrl, 'GET', '/orders', { token: adminToken });
  assert.equal(adminOrders.status, 200);

  const mePasswordFail = await request(baseUrl, 'POST', `/users/update-password/${userId}`, {
    token: userToken,
    body: { newPassword: 'NewPassword123!' }
  });
  assert.equal(mePasswordFail.status, 400);

  const mePasswordPass = await request(baseUrl, 'POST', `/users/update-password/${userId}`, {
    token: userToken,
    body: { currentPassword: 'Password123!', newPassword: 'NewPassword123!' }
  });
  assert.equal(mePasswordPass.status, 200);

  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();

  t.diagnostic('RBAC integration smoke test completed.');
});
