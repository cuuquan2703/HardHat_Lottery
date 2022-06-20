const { assert, expect } = require("chai");
const { network, ethers, deployments } = require("hardhat");
const { networkID, defaultNetwork } = require("../helper-hardhat");

!defaultNetwork.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle,
        raffleContract,
        vrfCoordinatorV2Mock,
        raffleEntranceFee,
        interval,
        player,
        accounts;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        player = accounts[1];
        await deployments.fixture(["mocks", "raffle"]);
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        raffleContract = await ethers.getContract("Raffle");
        raffle = raffleContract.connect(player);
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });

      describe("constructor", function () {
        it("Initialize the Raffle correctly", async () => {
          const raffleState = (await raffle.getRaffleState()).toString();
          assert.equal(
            interval.toString(),
            networkID[network.config.chainId].Interval
          );
        });
      });

      describe("Enter Raffle ", function () {
        it("Revert when you dont pay engouh", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWith(
            "Raffle__SendMoreToEnterRaffle"
          );
        });
        it("Record players when the entey", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const contractPlayer = await raffle.getPlayer(0);
          assert.equal(player.address, contractPlayer);
        });
        it("emits events on enter", async () => {
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(raffle, "RaffleEnter");
        });
        it("doesnt allow entrance when raffle is pendind", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });

          await raffle.performUpkeep([]);
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWith("Raffle__RaffleNotOpen");
        });
      });

      describe("CheckupKeep", function () {
        it("return false if people havent sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
          assert(!upkeepNeeded);
        });

        it("return false if raffle isnt open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          await raffle.performUpkeep([]);
          const rafflestate = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
          assert.equal(rafflestate.toString() === "1", upkeepNeeded === false);
        });

        it("returns false if enough time hast passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
          assert(upkeepNeeded);
        });

        it("return true if enough time has passed, has player,eth,and is open ", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
          assert(upkeepNeeded);
        });

        describe("performUpkeep", function () {
          it("Can only run if checkUpkeep is true", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });
            const tx = await raffle.performUpkeep("0x");
            assert(tx);
          });

          it("revert if checup is false", async () => {
            await expect(raffle.performUpkeep("0x")).to.be.revertedWith(
              "Raffle__UpkeepNotNeeded"
            );
          });

          it("updates the raffle state and emits a requestId", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });
            const TxResponse = await raffle.performUpkeep("0x");
            const TxRecipt = await TxResponse.wait(1);
            const rafflestate = await raffle.getRaffleState();
            const requestId = TxRecipt.events[1].args.requestId;
            assert(requestId.toNumber() > 0);
            assert(rafflestate === 1);
          });
        });

        describe("fulfillRandomWord", function () {
          beforeEach(async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ]);
            await network.provider.request({ method: "evm_mine", params: [] });
          });

          it("can only called after performUpkeep", async () => {
            await expect(
              vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
            ).to.be.revertedWith("nonexistent request");
          });

          it("picks a winner, resets, and sends money", async () => {
            const additonalEntrances = 3;
            const startingIndex = 2;
            for (
              let i = startingIndex;
              i < startingIndex + additonalEntrances;
              i++
            ) {
              raffle = raffleContract.connect(accounts[i]);
              await raffle.enterRaffle({ value: raffleEntranceFee });
            }
            const startingTimeStamp = await raffle.getLastTimeStamp();

            await new Promise(async (resolve, reject) => {
              raffle.once("WinnerPicked", async () => {
                console.log("WinnerPicked event first");
                try {
                  const recentWinner = await raffle.getRecentWinner();
                  const raffleState = await raffle.getRaffleState();
                  const winnerBalance = await accounts[2].getBalance();
                  const endingTimeStamp = await raffle.getLastTimeStamp();
                  await expect(raffle.getPlayer(0)).to.be.reverted;
                  assert.equal(raffleState, 0);
                  assert.equal(
                    winnerBalance.toString(),
                    startingBalance
                      .add(
                        raffleEntranceFee
                          .mul(additonalEntrances)
                          .add(raffleEntranceFee)
                      )
                      .toString()
                  );
                  assert(endingTimeStamp > startingTimeStamp);
                  resolve();
                } catch (e) {
                  reject(e);
                }
              });
              const tx = await raffle.performUpkeep("0x");
              const TxRecipt = await tx.wait(1);
              const startingBalance = await accounts[2].getBalance();
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                TxRecipt.events[1].args.requestId,
                raffle.address
              );
            });
          });
        });
      });
    });
