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

interface IERC95 {
    /// public function to unwrap
    function unwrap(uint256 amt) external;

    function wrap(address to, uint256 amt) external;
}

contract COREArbi is Initializable, OwnableUpgradeable {
    address constant FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant CORE = 0x62359Ed7505Efc61FF1D56fEF82158CcaffA23D7;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant WDAI = 0x00a66189143279b6DB9b77294688F47959F37642;
    address constant WCORE = 0x17B8c1A92B66b1CF3092C5d223Cb3a129023b669;
    address constant FOT = 0x2e2A33CECA9aeF101d679ed058368ac994118E7a;
    address constant ME = 0xB1d2339375Fd56Aa47ed31948D6d779a1A803f56;
    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; 
    address constant WWBTC = 0x7b5982dcAB054C377517759d0D2a3a5D02615AB8;
    IChi constant chi = IChi(0x0000000000004946c0e9F43F4Dee607b0eF1fA1c);
    uint8 public version;

    modifier discountCHI {
        _;
        if (tx.gasprice > 120e9) {
            chi.freeFromUpTo(msg.sender, 11);
        }
    }

    function initialize() public initializer {
        OwnableUpgradeable.__Ownable_init();
        version = 0x1;
    }

    function approve(address[] memory _tokens, address[] memory _spenders ) public onlyOwner {
        require(_tokens.length == _spenders.length, "input length does not match");
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(IERC20(_tokens[i]).approve(_spenders[i], uint256(-1)), "failed to approve");
        }
    }

    function withdrawTokens(address[] memory _tokens, uint256[] memory _amounts, address _to) public onlyOwner {
        require(_tokens.length == _amounts.length, "input parameters is not right");
        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 balance = IERC20(_tokens[i]).balanceOf(address(this));
            require(balance > 0, "zero balance");
            if (_amounts[i] > balance) {
                IERC20(_tokens[i]).transfer(_to, balance);
            } else {
                IERC20(_tokens[i]).transfer(_to, _amounts[i]);
            }
        }
    }

    function getArbiProfit( address[] memory sellPath, address[] memory buyPath, uint256 amount) 
    public view returns (uint256 profit) {
        uint256[] memory sellPrices = UniswapV2Library.getAmountsOut(FACTORY, amount, sellPath);
        uint256 outAmount = amountAfterFee(sellPrices[sellPrices.length - 1]);
        uint256[] memory buyPrice= UniswapV2Library.getAmountsIn(FACTORY, amount, buyPath);
        uint256 inAmount = buyPrice[0];
        return outAmount > inAmount ? outAmount - inAmount : 0;
    }

    function executeArbi(address[] calldata sellPath, address[] calldata buyPath, 
    uint256 amount, uint256 cost) external onlyOwner discountCHI {
        uint256 profit = getArbiProfit(sellPath, buyPath, amount);
        require(profit > cost, "no profit");
        wrapOrUnwrap(sellPath[0], amount);
        IUniSwapRouter(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amount,
            0,
            sellPath,
            address(this),
            block.timestamp
        );

        uint256[] memory prices = UniswapV2Library.getAmountsIn(FACTORY, amount, buyPath);

        wrapOrUnwrap(buyPath[0], prices[0]);

        IUniSwapRouter(ROUTER).swapTokensForExactTokens(amount, uint256(-1), buyPath, address(this), block.timestamp);

    }

    function amountAfterFee(uint256 amount) internal view returns (uint256) {
        uint256 fee = IFeeApprover(FOT).feePercentX100();
        return (amount * (1000 - fee)) / 1000;
    }

    function wrapOrUnwrap(address token, uint256 amount) internal {
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        if(balance > amount) {
            return;
        }

        if(token == DAI)  {
            unwrap(DAI, WDAI, amount);
            return;
        } 

        if (token == CORE) {
            unwrap(CORE, WCORE, amount);
            return;
        } 
        
        if (token == WBTC) {
            unwrap(WBTC, WWBTC, amount);
            return;
        } 
        
        if (token == WDAI) {
            wrap(DAI, WDAI, amount);
            return;
        }

        if (token == WCORE) {
            wrap(CORE, WCORE, amount);
            return;
        }

        if (token == WWBTC) {
            wrap(WBTC, WWBTC, amount);
            return;
        }

    }

    function wrap(address token, address erc95Token, uint256 amount) internal {
        uint256 nativeBalance = IERC20(token).balanceOf(address(this));
        uint256 wrappedBalance = IERC20(erc95Token).balanceOf(address(this));
        uint256 more = (nativeBalance + wrappedBalance)/2 + amount - wrappedBalance;
        uint256 finalAmount = nativeBalance > more ? more : nativeBalance;
        IERC95(erc95Token).wrap(address(this), finalAmount);
    }

    function unwrap(
        address token,
        address erc95Token,
        uint256 amount
    ) internal {
        uint256 nativeBalance = IERC20(token).balanceOf(address(this));
        uint256 wrappedBalance = IERC20(erc95Token).balanceOf(address(this));
        uint256 more = (nativeBalance + wrappedBalance)/2 + amount - nativeBalance;
        uint256 finalAmount = wrappedBalance > more ? more : wrappedBalance;
        IERC95(erc95Token).unwrap(finalAmount);
    }

}
