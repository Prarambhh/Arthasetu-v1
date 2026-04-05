const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Mock AUSD stablecoin...");
  const MockAUSD = await ethers.getContractFactory("MockAUSD");
  const ausd = await MockAUSD.deploy();
  await ausd.waitForDeployment();
  const ausdAddress = await ausd.getAddress();
  console.log(`✅ MockAUSD deployed to: ${ausdAddress}`);

  console.log("Deploying ArthaSetuLoans protocol...");
  const ArthaSetuLoans = await ethers.getContractFactory("ArthaSetuLoans");
  const loans = await ArthaSetuLoans.deploy(ausdAddress);
  await loans.waitForDeployment();
  const loansAddress = await loans.getAddress();
  console.log(`✅ ArthaSetuLoans deployed to: ${loansAddress}`);

  console.log("\n=================================");
  console.log("🚀 Deployment Complete!");
  console.log(`AUSD_ADDRESS=${ausdAddress}`);
  console.log(`PROTOCOL_ADDRESS=${loansAddress}`);
  console.log("=================================\n");
  console.log("Add these to your frontend/.env:");
  console.log(`VITE_AUSD_ADDRESS=${ausdAddress}`);
  console.log(`VITE_PROTOCOL_ADDRESS=${loansAddress}`);
  console.log(`VITE_CHAIN_ID=31337`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
