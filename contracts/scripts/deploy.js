const hre = require("hardhat");

async function main() {
  console.log("Deploying WaterQualityRegistry contract...");

  const WaterQualityRegistry = await hre.ethers.getContractFactory("WaterQualityRegistry");
  const registry = await WaterQualityRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("WaterQualityRegistry deployed to:", address);
  console.log("\nSave this address to your backend .env file as CONTRACT_ADDRESS");

  // Verify contract on Etherscan (if on a public network)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nWaiting for block confirmations...");
    await registry.deploymentTransaction().wait(5);

    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

