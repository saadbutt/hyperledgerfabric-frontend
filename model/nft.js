const mongoose = require("mongoose");

const NFTSchema = new mongoose.Schema({
  nftNum: { type: Number, default: 1 },
});

module.exports = mongoose.model("nft", NFTSchema);


