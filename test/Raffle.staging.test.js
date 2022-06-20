const { ethers, network, getNamedAccounts, deployments } = require("hardhat");
const { assert, expect } = require("chai");
const { defaultNetwork, networkID } = require("../helper-hardhat");

!defaultNetwork.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging  Tests", function () {
      let raffle, raffleEntranceFee, deployer;

      beforeEach(async () => {
        deployer = await getNamedAccounts();
        raffle = await ethers.getContract("Raffle");
        raffleEntranceFee = await raffle.getEntranceFee();
      });
    });
