import { expect } from "chai";
import { ethers } from "hardhat";

describe("Simple Test", function () {
  it("Should pass a basic test", async function () {
    expect(1 + 1).to.equal(2);
  });

  it("Should be able to get signers", async function () {
    const [owner, player1] = await ethers.getSigners();
    expect(owner.address).to.be.a("string");
    expect(player1.address).to.be.a("string");
  });
}); 