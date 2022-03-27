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

        // registed with bentobox
    }

    function setBentoBoxApproval(
        address user,
        bool approved,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        
    }

    function createProject(
        IERC20 token,
        uint128 goal,
        uint64 start,
        uint64 end
    ) external override returns (uint256 fundId) {
        
    }

    function fundProject(
        uint256 fundId,
        uint128 amount,
        bool fromBentoBox
    ) external payable override returns (uint128 depositedShares) {
        
    }

    function refund(uint256 fundId, bool toBentoBox)
        external
        override
        returns (uint128 amount)
    {
        
    }

    function withdraw(uint256 fundId, bool toBentoBox)
        external
        override
        returns (uint128 amount)
    {
       
    }

    
}
