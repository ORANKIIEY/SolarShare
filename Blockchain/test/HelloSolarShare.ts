import { expect } from "chai";
import hre from "hardhat";

describe("Toolchain smoke test", function () {
  it("deploys a contract on the local chain and reads from it", async function () {
    const hello = await hre.viem.deployContract("HelloSolarShare");

    expect(await hello.read.NAME()).to.equal("SolarShare");
    expect(await hello.read.greet()).to.equal("Hello from SolarShare");
  });
});
