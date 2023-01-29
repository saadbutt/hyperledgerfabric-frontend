const mongoose = require("mongoose");
const constants = require('../config/constants.json')

const MONGO_URI = constants.MONGO_URI;

exports.connect = () => {
  // Connecting to the database
  mongoose
    .connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Successfully connected to database");
    })
    .catch((error) =>{
      console.log("database connection failed. exiting now...");
      console.error(error);
      process.exit(1);
    });
};
