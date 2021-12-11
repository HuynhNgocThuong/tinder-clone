const authRoutes = require("./auth");
const userRoutes = require("./users");
const matchRequestsRoutes = require("./requests");

module.exports = function ({ app, dbConnect, upload, constant }) {
  authRoutes({ app, dbConnect });
  userRoutes({ app, dbConnect, upload, constant });
  matchRequestsRoutes({ app, dbConnect, constant });
};
