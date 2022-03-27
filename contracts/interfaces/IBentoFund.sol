// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./IBentoBoxMinimal.sol";
import "../utils/BoringBatchable.sol";
import "../utils/BoringOwnable.sol";

interface IBentoFund {
    function setBentoBoxApproval(
        address user,
        bool approved,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function createProject(
        IERC20 token,
        uint128 goal,
        uint64 start,
        uint64 end
    ) external returns (uint256 fundId);

    function fundProject(
        uint256 fundId,
        uint128 amount,
        bool fromBentoBox
    ) external payable returns (uint128 depositedShares);

    function refund(uint256 fundId, bool toBentoBox)
        external
        returns (uint128 amount);

    function withdraw(uint256 fundId, bool toBentoBox)
        external
        returns (uint128 amount);

    event LogCreateProject(
        uint256 indexed fundId,
        address indexed owner,
        IERC20 indexed token,
        uint128 goal,
        uint64 start,
        uint64 end
    );

    event LogFundProject(uint256 indexed fundId, uint128 amount);

    event LogRefund(uint256 indexed fundId, address indexed funder);

    event LogWithdraw(uint256 indexed fundId, address indexed owner);
}
