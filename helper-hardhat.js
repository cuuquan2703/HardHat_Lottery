const { ethers } = require("hardhat");
const networkID = {
  4: {
    NetworkName: "Rinkeby",
    URL: "",
    VRFCoordinator: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    GasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    Interval: "30",
    SubscriptionId: "588",
    EntranceFee: ethers.utils.parseEther("0.01"),
    CallbackGasLimit: "500000",
  },
  31337: {
    NetworkName: "localhost",
    GasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    Interval: "30",
    SubscriptionId: "588",
    EntranceFee: ethers.utils.parseEther("0.01"),
    CallbackGasLimit: "500000",
  },
  1337: {
    NetworkName: "Polygon",
    URL: "",
  },
};

const defaultNetwork = ["localhost", "hardhat"];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
module.exports = {
  networkID,
  defaultNetwork,
  VERIFICATION_BLOCK_CONFIRMATIONS,
};
