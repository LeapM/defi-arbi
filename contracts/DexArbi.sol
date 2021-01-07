pragma solidity ^0.6.6;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import 'hardhat/console.sol';

interface IFeeApprover {
    function feePercentX100() external view returns (uint256);
}
interface IChi {
    function freeFromUpTo(address from, uint256 value) external returns (uint256);
}
interface IUniSwapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract DexArbi {
    address constant FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    IChi constant chi = IChi(0x0000000000004946c0e9F43F4Dee607b0eF1fA1c);
    address public owner;
    modifier discountCHI {
        _;
        if (tx.gasprice > 120e9) {
            chi.freeFromUpTo(msg.sender, 11);
        }
    }

    modifier onlyOwner {
        require(msg.sender == owner, "only owner");
        _;
    }
    constructor() public {
        owner = msg.sender;
    }

    function setOwner(address _owner) onlyOwner external {
        owner = _owner;
    }

    function approve(address[] calldata _tokens, address[] calldata _spenders ) external onlyOwner {
        require(_tokens.length == _spenders.length, "input length does not match");
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(IERC20(_tokens[i]).approve(_spenders[i], uint256(-1)), "failed to approve");
        }
    }

    function executeArbi(address[] calldata path, uint256 amount, uint256 cost, uint256 chiAmount) external onlyOwner {
        uint256[] memory profits = UniswapV2Library.getAmountsOut(FACTORY, amount, path);
        uint256 profit = profits[profits.length - 1];

        require(profit > cost + amount, "no profit");

        IERC20(path[0]).transferFrom(owner, address(this), amount);
        uint256[] memory outputs = IUniSwapRouter(ROUTER).swapExactTokensForTokens(
            amount,
            0,
            path,
            owner,
            block.timestamp
        );

        uint256 output = outputs[outputs.length - 1];

        if(chiAmount > 0) {
            chi.freeFromUpTo(msg.sender, chiAmount);
        }
    }
}
