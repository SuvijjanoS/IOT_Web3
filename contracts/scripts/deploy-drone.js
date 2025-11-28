const hre = require("hardhat");

async function main() {
  console.log("Deploying DroneFlightRegistry contract...");

  const DroneFlightRegistry = await hre.ethers.getContractFactory("DroneFlightRegistry");
  const registry = await DroneFlightRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("DroneFlightRegistry deployed to:", address);
  console.log("\nAdd this to your .env file:");
  console.log(`DRONE_FLIGHT_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

