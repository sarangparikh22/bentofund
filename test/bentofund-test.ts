//@ts-nocheck

import { ethers, waffle } from "hardhat";
import { Signer, BigNumber } from "ethers";
import { expect } from "chai";
import {
  toShare,
  toAmount,
  getBentoBalance,
  getBigNumber,
  snapshot,
  restore,
  latest,
  increase,
  duration,
  ADDRESS_ZERO,
  getSignedMasterContractApprovalData,
  ZERO,
} from "./harness";

describe("#Create Project", function () {
  let accounts: Signer[];

  let snapshotId;

  let bento;
  let bentoFund;
  let tokens = [];
  let wETH;

  before(async function () {
    accounts = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const BentoBoxV1 = await ethers.getContractFactory("BentoBoxV1");
    const BentoFund = await ethers.getContractFactory("BentoFund");

    let promises = [];
    for (let i = 0; i < 1; i++) {
      promises.push(
        ERC20.deploy("Token" + i, "TOK" + i, getBigNumber(1000000))
      );
    }

    tokens = await Promise.all(promises);
    wETH = await ERC20.deploy("Wrapped ETH", "wETH", getBigNumber(1000000));
    bento = await BentoBoxV1.deploy(wETH.address);
    bentoFund = await BentoFund.deploy(bento.address, wETH.address);

    await bento.whitelistMasterContract(bentoFund.address, true);

    promises = [];
    for (let i = 0; i < tokens.length; i++) {
      promises.push(
        tokens[i].approve(bento.address, getBigNumber(1000000)).then(() => {
          bento.deposit(
            tokens[i].address,
            accounts[0].address,
            accounts[0].address,
            getBigNumber(500000),
            0
          );
        })
      );
    }

    await Promise.all(promises);
    await bento.setMasterContractApproval(
      accounts[0].address,
      bentoFund.address,
      true,
      "0",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    await bento
      .connect(accounts[1])
      .setMasterContractApproval(
        accounts[1].address,
        bentoFund.address,
        true,
        "0",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
  });

  beforeEach(async function () {
    snapshotId = await snapshot();
  });

  afterEach(async function () {
    await restore(snapshotId);
  });

  it("should not allow to create project earlier than current time", async function () {
    const current = await latest();
    await expect(
      bentoFund.createProject(
        tokens[0].address,
        getBigNumber(1),
        current.sub(1),
        current.add(100)
      )
    ).to.be.revertedWith("BentoFund: Invalid Start Time");
  });

  it("should not allow to create project if end is smaller than start", async function () {
    const current = await latest();
    await expect(
      bentoFund.createProject(
        tokens[0].address,
        getBigNumber(1),
        current.add(100),
        current.add(99)
      )
    ).to.be.revertedWith("BentoFund: Invalid End Time");
  });

  it("should allow to create project", async function () {
    const current = await latest();
    const goal = getBigNumber(1000);
    const start = current.add(100);
    const end = current.add(200);

    const fundId = await bentoFund.fundIds();
    await bentoFund.createProject(tokens[0].address, goal, start, end);
    const newFundId = await bentoFund.fundIds();

    const fundData = await bentoFund.funds(fundId);

    expect(newFundId).to.be.eq(fundId.add(1));
    expect(fundData.owner).to.be.eq(accounts[0].address);
    expect(fundData.goal).to.be.eq(goal);
    expect(fundData.depositedShares).to.be.eq(ZERO);
    expect(fundData.start).to.be.eq(start);
    expect(fundData.end).to.be.eq(end);
  });
});

describe("#Fund Project", function () {
  let accounts: Signer[];

  let snapshotId;

  let bento;
  let bentoFund;
  let tokens = [];
  let wETH;
  let fundId;
  let goal;
  let start;
  let end;

  before(async function () {
    accounts = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const BentoBoxV1 = await ethers.getContractFactory("BentoBoxV1");
    const BentoFund = await ethers.getContractFactory("BentoFund");

    let promises = [];
    for (let i = 0; i < 1; i++) {
      promises.push(
        ERC20.deploy("Token" + i, "TOK" + i, getBigNumber(1000000))
      );
    }

    tokens = await Promise.all(promises);
    wETH = await ERC20.deploy("Wrapped ETH", "wETH", getBigNumber(1000000));
    bento = await BentoBoxV1.deploy(wETH.address);
    bentoFund = await BentoFund.deploy(bento.address, wETH.address);

    await bento.whitelistMasterContract(bentoFund.address, true);

    promises = [];
    for (let i = 0; i < tokens.length; i++) {
      promises.push(
        tokens[i].approve(bento.address, getBigNumber(1000000)).then(() => {
          bento.deposit(
            tokens[i].address,
            accounts[0].address,
            accounts[0].address,
            getBigNumber(500000),
            0
          );
        })
      );
    }

    await Promise.all(promises);
    await bento.setMasterContractApproval(
      accounts[0].address,
      bentoFund.address,
      true,
      "0",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    await bento
      .connect(accounts[1])
      .setMasterContractApproval(
        accounts[1].address,
        bentoFund.address,
        true,
        "0",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

    fundId = await bentoFund.fundIds();
    goal = getBigNumber(1000);
    start = (await latest()).add(100);
    end = start.add(100);

    await bentoFund.createProject(tokens[0].address, goal, start, end);
  });

  beforeEach(async function () {
    snapshotId = await snapshot();
  });

  afterEach(async function () {
    await restore(snapshotId);
  });

  it("should not allow fund before start time", async function () {
    const amountToFund = getBigNumber(100);
    await expect(
      bentoFund.fundProject(fundId, amountToFund, true)
    ).to.be.revertedWith("BentoFund: Project Not Started");
  });

  it("should not allow fund after end time", async function () {
    await increase(BigNumber.from(200));
    const amountToFund = getBigNumber(100);
    await expect(
      bentoFund.fundProject(fundId, amountToFund, true)
    ).to.be.revertedWith("BentoFund: Project ended");
  });

  it("should allow to fund project from bento", async function () {
    await increase(BigNumber.from(100));
    const amountToFund = getBigNumber(100);

    const preUserBalanceBento = await getBentoBalance(
      bento,
      tokens[0],
      accounts[0].address
    );
    const preBentoFundBalanceBento = await getBentoBalance(
      bento,
      tokens[0],
      bentoFund.address
    );
    const preFundData = await bentoFund.funds(fundId);
    const preFundUserDeposit = await bentoFund.funders(
      fundId,
      accounts[0].address
    );

    await bentoFund.fundProject(fundId, amountToFund, true);

    const postFundUserDeposit = await bentoFund.funders(
      fundId,
      accounts[0].address
    );
    const postFundData = await bentoFund.funds(fundId);
    const postUserBalanceBento = await getBentoBalance(
      bento,
      tokens[0],
      accounts[0].address
    );
    const postBentoFundBalanceBento = await getBentoBalance(
      bento,
      tokens[0],
      bentoFund.address
    );

    expect(postUserBalanceBento).to.be.eq(
      preUserBalanceBento.sub(amountToFund)
    );
    expect(postBentoFundBalanceBento).to.be.eq(
      preBentoFundBalanceBento.add(amountToFund)
    );
    expect(postFundData.depositedShares).to.be.eq(
      preFundData.depositedShares.add(
        await toShare(bento, tokens[0], amountToFund)
      )
    );
    expect(postFundUserDeposit).to.be.eq(
      preFundUserDeposit.add(await toShare(bento, tokens[0], amountToFund))
    );
  });

  it("should allow to fund project from token", async function () {
    await increase(BigNumber.from(100));
    const amountToFund = getBigNumber(100);

    const preUserBalanceToken = await tokens[0].balanceOf(accounts[0].address);
    const preBentoFundBalanceBento = await getBentoBalance(
      bento,
      tokens[0],
      bentoFund.address
    );
    const preFundData = await bentoFund.funds(fundId);
    const preFundUserDeposit = await bentoFund.funders(
      fundId,
      accounts[0].address
    );

    await bentoFund.fundProject(fundId, amountToFund, false);

    const postFundUserDeposit = await bentoFund.funders(
      fundId,
      accounts[0].address
    );
    const postFundData = await bentoFund.funds(fundId);
    const postUserBalanceToken = await tokens[0].balanceOf(accounts[0].address);
    const postBentoFundBalanceBento = await getBentoBalance(
      bento,
      tokens[0],
      bentoFund.address
    );

    expect(postUserBalanceToken).to.be.eq(
      preUserBalanceToken.sub(amountToFund)
    );
    expect(postBentoFundBalanceBento).to.be.eq(
      preBentoFundBalanceBento.add(amountToFund)
    );
    expect(postFundData.depositedShares).to.be.eq(
      preFundData.depositedShares.add(
        await toShare(bento, tokens[0], amountToFund)
      )
    );
    expect(postFundUserDeposit).to.be.eq(
      preFundUserDeposit.add(await toShare(bento, tokens[0], amountToFund))
    );
  });

  it("should allow to fund project from token native", async function () {
    const xfundId = await bentoFund.fundIds();
    const xgoal = getBigNumber(2);
    const xstart = (await latest()).add(100);
    const xend = start.add(100);

    await bentoFund.createProject(wETH.address, xgoal, xstart, xend);

    await increase(BigNumber.from(100));
    const amountToFund = getBigNumber(1);
    const provider = waffle.provider;

    const preUserBalanceToken = await provider.getBalance(accounts[0].address);
    const preBentoFundBalanceBento = await getBentoBalance(
      bento,
      wETH,
      bentoFund.address
    );
    const preFundData = await bentoFund.funds(xfundId);

    const preFundUserDeposit = await bentoFund.funders(
      xfundId,
      accounts[0].address
    );

    await bentoFund.fundProject(xfundId, amountToFund, false, {
      value: amountToFund,
    });

    const postFundUserDeposit = await bentoFund.funders(
      xfundId,
      accounts[0].address
    );
    const postFundData = await bentoFund.funds(xfundId);
    const postUserBalanceToken = await provider.getBalance(accounts[0].address);
    const postBentoFundBalanceBento = await getBentoBalance(
      bento,
      wETH,
      bentoFund.address
    );

    expect(postUserBalanceToken).to.be.lte(
      preUserBalanceToken.sub(amountToFund)
    );
    expect(postBentoFundBalanceBento).to.be.eq(
      preBentoFundBalanceBento.add(amountToFund)
    );
    expect(postFundData.depositedShares).to.be.eq(
      preFundData.depositedShares.add(await toShare(bento, wETH, amountToFund))
    );
    expect(postFundUserDeposit).to.be.eq(
      preFundUserDeposit.add(await toShare(bento, wETH, amountToFund))
    );
  });
});

describe("#Get Refund", function () {
  let accounts: Signer[];

  let snapshotId;

  let bento;
  let bentoFund;
  let tokens = [];
  let wETH;
  let fundId;
  let goal;
  let start;
  let end;

  before(async function () {
    accounts = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const BentoBoxV1 = await ethers.getContractFactory("BentoBoxV1");
    const BentoFund = await ethers.getContractFactory("BentoFund");

    let promises = [];
    for (let i = 0; i < 1; i++) {
      promises.push(
        ERC20.deploy("Token" + i, "TOK" + i, getBigNumber(1000000))
      );
    }

    tokens = await Promise.all(promises);
    wETH = await ERC20.deploy("Wrapped ETH", "wETH", getBigNumber(1000000));
    bento = await BentoBoxV1.deploy(wETH.address);
    bentoFund = await BentoFund.deploy(bento.address, wETH.address);

    await bento.whitelistMasterContract(bentoFund.address, true);

    promises = [];
    for (let i = 0; i < tokens.length; i++) {
      promises.push(
        tokens[i].approve(bento.address, getBigNumber(1000000)).then(() => {
          bento.deposit(
            tokens[i].address,
            accounts[0].address,
            accounts[0].address,
            getBigNumber(500000),
            0
          );
        })
      );
    }

    await Promise.all(promises);
    await bento.setMasterContractApproval(
      accounts[0].address,
      bentoFund.address,
      true,
      "0",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    await bento
      .connect(accounts[1])
      .setMasterContractApproval(
        accounts[1].address,
        bentoFund.address,
        true,
        "0",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

    fundId = await bentoFund.fundIds();
    goal = getBigNumber(1000);
    start = (await latest()).add(100);
    end = start.add(100);

    await bentoFund.createProject(tokens[0].address, goal, start, end);
  });

  beforeEach(async function () {
    snapshotId = await snapshot();
  });

  afterEach(async function () {
    await restore(snapshotId);
  });

  it("should not allow to get refund when project not ended", async function () {
    await expect(bentoFund.refund(fundId, true)).to.be.revertedWith(
      "BentoFund: Project not ended"
    );
  });

  it("should not allow to get refund when project funding is successful", async function () {
    await increase(BigNumber.from(100));
    await bentoFund.fundProject(fundId, goal, true);
    await increase(BigNumber.from(200));
    await expect(bentoFund.refund(fundId, true)).to.be.revertedWith(
      "BentoFund: Project funding success"
    );
  });

  it("should allow to get refund - bento", async function () {
    await increase(BigNumber.from(100));
    const amountToFund = getBigNumber(100);
    await bentoFund.fundProject(fundId, amountToFund, true);
    await increase(BigNumber.from(200));

    const preUserBalanceBento = await getBentoBalance(
      bento,
      tokens[0],
      accounts[0].address
    );
    const preFunderBalance = await bentoFund.funders(
      fundId,
      accounts[0].address
    );

    await bentoFund.refund(fundId, true);

    const postUserBalanceBento = await getBentoBalance(
      bento,
      tokens[0],
      accounts[0].address
    );
    const postFunderBalance = await bentoFund.funders(
      fundId,
      accounts[0].address
    );

    expect(postUserBalanceBento).to.be.eq(
      preUserBalanceBento.add(amountToFund)
    );
    expect(postFunderBalance).to.be.eq(preFunderBalance.sub(amountToFund));
  });

  it("should allow to get refund - native", async function () {
    await increase(BigNumber.from(100));
    const amountToFund = getBigNumber(100);
    await bentoFund.fundProject(fundId, amountToFund, false);
    await increase(BigNumber.from(200));

    const preUserBalanceToken = await tokens[0].balanceOf(accounts[0].address);

    const preFunderBalance = await bentoFund.funders(
      fundId,
      accounts[0].address
    );

    await bentoFund.refund(fundId, false);

    const postUserBalanceToken = await tokens[0].balanceOf(accounts[0].address);

    const postFunderBalance = await bentoFund.funders(
      fundId,
      accounts[0].address
    );

    expect(postUserBalanceToken).to.be.eq(
      preUserBalanceToken.add(amountToFund)
    );
    expect(postFunderBalance).to.be.eq(preFunderBalance.sub(amountToFund));
  });
});

describe("#Withdraw", function () {
  let accounts: Signer[];

  let snapshotId;

  let bento;
  let bentoFund;
  let tokens = [];
  let wETH;
  let fundId;
  let goal;
  let start;
  let end;

  before(async function () {
    accounts = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const BentoBoxV1 = await ethers.getContractFactory("BentoBoxV1");
    const BentoFund = await ethers.getContractFactory("BentoFund");

    let promises = [];
    for (let i = 0; i < 1; i++) {
      promises.push(
        ERC20.deploy("Token" + i, "TOK" + i, getBigNumber(1000000))
      );
    }

    tokens = await Promise.all(promises);
    wETH = await ERC20.deploy("Wrapped ETH", "wETH", getBigNumber(1000000));
    bento = await BentoBoxV1.deploy(wETH.address);
    bentoFund = await BentoFund.deploy(bento.address, wETH.address);

    await bento.whitelistMasterContract(bentoFund.address, true);

    promises = [];
    for (let i = 0; i < tokens.length; i++) {
      promises.push(
        tokens[i].approve(bento.address, getBigNumber(1000000)).then(() => {
          bento.deposit(
            tokens[i].address,
            accounts[0].address,
            accounts[0].address,
            getBigNumber(500000),
            0
          );
        })
      );
    }

    await Promise.all(promises);
    await bento.setMasterContractApproval(
      accounts[0].address,
      bentoFund.address,
      true,
      "0",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    await bento
      .connect(accounts[1])
      .setMasterContractApproval(
        accounts[1].address,
        bentoFund.address,
        true,
        "0",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

    fundId = await bentoFund.fundIds();
    goal = getBigNumber(1000);
    start = (await latest()).add(100);
    end = start.add(100);

    await bentoFund.createProject(tokens[0].address, goal, start, end);
  });

  beforeEach(async function () {
    snapshotId = await snapshot();
  });

  afterEach(async function () {
    await restore(snapshotId);
  });

  it("should not allow to get withdraw when project not ended", async function () {
    await expect(bentoFund.withdraw(fundId, true)).to.be.revertedWith(
      "BentoFund: Project not ended"
    );
  });

  it("should not allow to get withdraw when project funding is failed", async function () {
    await increase(BigNumber.from(100));
    await bentoFund.fundProject(fundId, getBigNumber(100), true);
    await increase(BigNumber.from(200));
    await expect(bentoFund.withdraw(fundId, true)).to.be.revertedWith(
      "BentoFund: Project funding failed"
    );
  });

  it("should allow to withdraw - bento", async function () {
    await increase(BigNumber.from(100));
    await bentoFund.fundProject(fundId, goal, true);
    await increase(BigNumber.from(200));

    const owner = (await bentoFund.funds(fundId)).owner;

    const preUserBalanceBento = await getBentoBalance(bento, tokens[0], owner);
    const preFundData = await bentoFund.funds(fundId);

    await bentoFund.withdraw(fundId, true);

    const postUserBalanceBento = await getBentoBalance(bento, tokens[0], owner);
    const postFundData = await bentoFund.funds(fundId);

    expect(postUserBalanceBento).to.be.eq(
      preUserBalanceBento.add(preFundData.depositedShares)
    );
    expect(postFundData.depositedShares).to.be.eq(ADDRESS_ZERO);
  });

  it("should allow to withdraw - native", async function () {
    await increase(BigNumber.from(100));
    await bentoFund.fundProject(fundId, goal, true);
    await increase(BigNumber.from(200));

    const owner = (await bentoFund.funds(fundId)).owner;

    const preUserBalanceToken = await tokens[0].balanceOf(owner);

    const preFundData = await bentoFund.funds(fundId);

    await bentoFund.withdraw(fundId, false);

    const postUserBalanceToken = await tokens[0].balanceOf(owner);
    const postFundData = await bentoFund.funds(fundId);

    expect(postUserBalanceToken).to.be.eq(
      preUserBalanceToken.add(
        await toAmount(bento, tokens[0], preFundData.depositedShares)
      )
    );
    expect(postFundData.depositedShares).to.be.eq(ADDRESS_ZERO);
  });
});

describe("#Batch", function () {
  let accounts: Signer[];

  let snapshotId;

  let bento;
  let bentoFund;
  let tokens = [];
  let wETH;
  let fundId;
  let goal;
  let start;
  let end;

  before(async function () {
    accounts = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const BentoBoxV1 = await ethers.getContractFactory("BentoBoxV1");
    const BentoFund = await ethers.getContractFactory("BentoFund");

    let promises = [];
    for (let i = 0; i < 1; i++) {
      promises.push(
        ERC20.deploy("Token" + i, "TOK" + i, getBigNumber(1000000))
      );
    }

    tokens = await Promise.all(promises);
    wETH = await ERC20.deploy("Wrapped ETH", "wETH", getBigNumber(1000000));
    bento = await BentoBoxV1.deploy(wETH.address);
    bentoFund = await BentoFund.deploy(bento.address, wETH.address);

    await bento.whitelistMasterContract(bentoFund.address, true);

    promises = [];
    for (let i = 0; i < tokens.length; i++) {
      promises.push(
        tokens[i].approve(bento.address, getBigNumber(1000000)).then(() => {
          bento.deposit(
            tokens[i].address,
            accounts[0].address,
            accounts[0].address,
            getBigNumber(500000),
            0
          );
        })
      );
    }

    await Promise.all(promises);

    fundId = await bentoFund.fundIds();
    goal = getBigNumber(1000);
    start = (await latest()).add(100);
    end = start.add(100);

    await bentoFund.createProject(tokens[0].address, goal, start, end);
  });

  beforeEach(async function () {
    snapshotId = await snapshot();
  });

  afterEach(async function () {
    await restore(snapshotId);
  });

  it("should be able to batch and fund project", async function () {
    await increase(BigNumber.from(100));
    const nonce = await bento.nonces(accounts[0].address);
    const { v, r, s } = getSignedMasterContractApprovalData(
      bento,
      accounts[0],
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      bentoFund.address,
      true,
      nonce
    );
    const masterContractApprovalData = bentoFund.interface.encodeFunctionData(
      "setBentoBoxApproval",
      [accounts[0].address, true, v, r, s]
    );

    const fundProjectData = bentoFund.interface.encodeFunctionData(
      "fundProject",
      [fundId, getBigNumber(100), true]
    );

    const batchData = [masterContractApprovalData, fundProjectData];

    await bentoFund.batch(batchData, true);
  });
});
