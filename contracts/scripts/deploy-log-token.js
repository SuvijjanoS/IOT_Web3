const hre = require("hardhat");

async function main() {
  console.log("Deploying LogToken contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const LogToken = await hre.ethers.getContractFactory("LogToken");
  const logToken = await LogToken.deploy();

  await logToken.waitForDeployment();

  const address = await logToken.getAddress();
  console.log("LogToken deployed to:", address);
  console.log("\nSave this address to your backend .env file as LOG_TOKEN_CONTRACT_ADDRESS");
  console.log("The deployer address is the owner and can mint tokens:", deployer.address);

  // Verify contract on Etherscan (if on a public network)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nWaiting for block confirmations...");
    await logToken.deploymentTransaction().wait(5);

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

