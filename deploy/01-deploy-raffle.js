const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  networkID,
  defaultNetwork,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat");
const { verify } = require("../util/verify");

const FUND_AMOUNT = "1000000000000000000000";

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainID = network.config.chainId;
  // args contains:
  // address VRFCoordinatorV2Interface
  // uint64 subscriptionId
  // bytes32 GasLane
  // uint256 interval
  // uint256 entranceFee
  // uint32 callbackGasLimit
  let vrfCoordinatorV2Address, subscriptionId;

  if (chainID === 31337) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const TxResponse = await vrfCoordinatorV2Mock.createSubscription();
    const TxReceipt = await TxResponse.wait();
    subscriptionId = TxReceipt.events[0].args.subId;
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkID[chainID].VRFCoordinator;
    subscriptionId = networkID[chainID].SubscriptionId;
  }

  const waitBlockConfirmation =
    chainID === 31337 ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS;

  const gasLane = networkID[chainID].GasLane;
  const interval = networkID[chainID].Interval;
  const entranceFee = networkID[chainID].EntranceFee;
  const callbackGasLimit = networkID[chainID].CallbackGasLimit;
  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    gasLane,
    interval,
    entranceFee,
    callbackGasLimit,
  ];
  const Raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitBlockConfirmation: waitBlockConfirmation,
  });

  // verify
  if (chainID !== 31337 && process.env.ETHERSCAN_API_KEY) {
    log("Verifying . . .");
    await verify(Raffle.address, args);
  }
  log("Deployed");
  log("--------------------------------------------------");
};

module.exports.tags = ["all", "raffle"];
