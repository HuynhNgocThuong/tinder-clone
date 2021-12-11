const env = require("dotenv");
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const multer = require("multer");
const mysql = require("mysql");
const path = require("path");
const PORT = process.env.PORT || 8080;
const constant = require("./constant/commonConstant");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// config multers.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/img");
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}.jpg`);
  },
});

const upload = multer({ storage: storage });

//Create db connection
const dbConnect = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER_NAME || "root",
  password: process.env.DB_USER_PASSWORD || "",
  database: process.env.DB_NAME || "tinder_clone",
  port: process.env.DB_PORT || "3306",
});

dbConnect.connect((error) => {
  if (error) {
    console.log(error);
    throw error;
  }
  console.log("Database was connected");
  require("./routes")({ app, dbConnect, upload, constant });
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
});
