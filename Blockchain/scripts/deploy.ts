// Deploy script. The real SolarShare contracts (token, meter oracle, revenue
// distributor, share sale) are added in later issues. For now this only
// checks that the deployer account is set up and shows its balance.
//
//   npm run deploy:local        (needs `npm run node` running in another terminal)
//   npm run deploy:baseSepolia  (needs DEPLOYER_PRIVATE_KEY in .env and test ETH)
import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  if (!deployer) {
    throw new Error(
      `No deployer account for network "${hre.network.name}". ` +
        "Put DEPLOYER_PRIVATE_KEY in Blockchain/.env (run `npm run wallet:new`).",
    );
  }
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: deployer.account.address });

  console.log(`Network:  ${hre.network.name} (chain id ${await publicClient.getChainId()})`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Balance:  ${formatEther(balance)} ETH`);
  console.log("No contracts to deploy yet.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
