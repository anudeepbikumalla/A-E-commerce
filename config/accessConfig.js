module.exports = {
  products: {
    get: ["root", "admin", "manager", "user"],
    post: ["root", "admin"],
    put: ["root", "admin"],
    delete: ["root", "admin"]
  },
  users: {
    get: ["root", "admin"],
    post: ["root", "admin"],
    put: ["root", "admin"],
    delete: ["root", "admin"]
  },
  orders: {
    get: ["root", "admin", "manager", "user"],
    post: ["root", "admin", "manager", "user"],
    put: ["root", "admin", "manager", "user"],
    delete: ["root", "admin", "user"]
  }
};
