import { expect } from "chai";
import { ethers } from "hardhat";

describe("Basic Contract Tests", function () {
  it("Should deploy MockVMF contract", async function () {
    const MockVMF = await ethers.getContractFactory("MockVMF");
    const mockVMF = await MockVMF.deploy();
    await mockVMF.waitForDeployment();
    
    expect(await mockVMF.name()).to.equal("Mock VMF");
    expect(await mockVMF.symbol()).to.equal("MVMF");
  });

  it("Should deploy PizzaParty contract", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy mock VMF first
    const MockVMF = await ethers.getContractFactory("MockVMF");
    const mockVMF = await MockVMF.deploy();
    await mockVMF.waitForDeployment();
    
    // Deploy PizzaParty
    const PizzaParty = await ethers.getContractFactory("PizzaParty");
    const pizzaParty = await PizzaParty.deploy(await mockVMF.getAddress());
    await pizzaParty.waitForDeployment();
    
    expect(await pizzaParty.vmfToken()).to.equal(await mockVMF.getAddress());
    expect(await pizzaParty.owner()).to.equal(owner.address);
  });

  it("Should have correct game constants", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy mock VMF first
    const MockVMF = await ethers.getContractFactory("MockVMF");
    const mockVMF = await MockVMF.deploy();
    await mockVMF.waitForDeployment();
    
    // Deploy PizzaParty
    const PizzaParty = await ethers.getContractFactory("PizzaParty");
    const pizzaParty = await PizzaParty.deploy(await mockVMF.getAddress());
    await pizzaParty.waitForDeployment();
    
    expect(await pizzaParty.DAILY_ENTRY_FEE()).to.equal(ethers.parseEther("1"));
    expect(await pizzaParty.DAILY_WINNERS_COUNT()).to.equal(8);
    expect(await pizzaParty.WEEKLY_WINNERS_COUNT()).to.equal(10);
  });
}); 