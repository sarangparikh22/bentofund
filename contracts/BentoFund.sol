// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import "./interfaces/IBentoFund.sol";

contract BentoFund is IBentoFund, BoringOwnable, BoringBatchable {
    struct Project {
        address owner;
        IERC20 token;
        uint128 goal;
        uint128 depositedShares;
        uint64 start;
        uint64 end;
    }

    IBentoBoxMinimal public immutable bentoBox;
    address public immutable wETH;

    uint256 public fundIds;

    mapping(uint256 => Project) public funds;
    mapping(uint256 => mapping(address => uint128)) public funders;

    constructor(IBentoBoxMinimal _bentoBox, address _wETH) {
        bentoBox = _bentoBox;
        wETH = _wETH;
        fundIds = 1;
        _bentoBox.registerProtocol();
    }

    function setBentoBoxApproval(
        address user,
        bool approved,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        bentoBox.setMasterContractApproval(
            user,
            address(this),
            approved,
            v,
            r,
            s
        );
    }

    function createProject(
        IERC20 token,
        uint128 goal,
        uint64 start,
        uint64 end
    ) external override returns (uint256 fundId) {
        require(start > block.timestamp, "BentoFund: Invalid Start Time");
        require(end > start, "BentoFund: Invalid End Time");

        fundId = fundIds++;

        funds[fundId] = Project({
            owner: msg.sender,
            token: token,
            goal: goal,
            depositedShares: 0,
            start: start,
            end: end
        });

        emit LogCreateProject(fundId, msg.sender, token, goal, start, end);
    }

    function fundProject(
        uint256 fundId,
        uint128 amount,
        bool fromBentoBox
    ) external payable override returns (uint128 depositedShares) {
        Project storage project = funds[fundId];
        require(
            block.timestamp >= project.start,
            "BentoFund: Project Not Started"
        );
        require(project.end > block.timestamp, "BentoFund: Project ended");

        depositedShares = uint128(
            _depositToken(
                address(project.token),
                msg.sender,
                address(this),
                amount,
                fromBentoBox
            )
        );

        project.depositedShares += depositedShares;
        funders[fundId][msg.sender] += depositedShares;

        emit LogFundProject(fundId, amount);
    }

    function refund(uint256 fundId, bool toBentoBox)
        external
        override
        returns (uint128 amount)
    {
        Project storage project = funds[fundId];

        require(block.timestamp > project.end, "BentoFund: Project not ended");

        require(
            project.depositedShares < project.goal,
            "BentoFund: Project funding success"
        );

        amount = funders[fundId][msg.sender];
        funders[fundId][msg.sender] = 0;

        _transferToken(
            address(project.token),
            address(this),
            msg.sender,
            amount,
            toBentoBox
        );

        emit LogRefund(fundId, msg.sender);
    }

    function withdraw(uint256 fundId, bool toBentoBox)
        external
        override
        returns (uint128 amount)
    {
        Project storage project = funds[fundId];

        require(block.timestamp > project.end, "BentoFund: Project not ended");

        require(
            project.depositedShares >= project.goal,
            "BentoFund: Project funding failed"
        );

        amount = project.depositedShares;
        project.depositedShares = 0;

        _transferToken(
            address(project.token),
            address(this),
            project.owner,
            amount,
            toBentoBox
        );

        emit LogWithdraw(fundId, msg.sender);
    }

    function _depositToken(
        address token,
        address from,
        address to,
        uint256 amount,
        bool fromBentoBox
    ) internal returns (uint256 depositedShares) {
        if (token == wETH && address(this).balance >= amount) {
            (, depositedShares) = bentoBox.deposit{value: amount}(
                address(0),
                from,
                to,
                amount,
                0
            );
        } else {
            if (fromBentoBox) {
                depositedShares = bentoBox.toShare(token, amount, false);
                bentoBox.transfer(token, from, to, depositedShares);
            } else {
                (, depositedShares) = bentoBox.deposit(
                    token,
                    from,
                    to,
                    amount,
                    0
                );
            }
        }
    }

    function _transferToken(
        address token,
        address from,
        address to,
        uint256 amount,
        bool toBentoBox
    ) internal {
        if (toBentoBox) {
            bentoBox.transfer(token, from, to, amount);
        } else {
            bentoBox.withdraw(token, from, to, 0, amount);
        }
    }
}
