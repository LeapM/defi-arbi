pragma solidity ^0.6.6;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
// import "@openzeppelin/contracts/proxy/Initializable.sol";
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import 'hardhat/console.sol';

interface IFeeApprover {
    function feePercentX100() external view returns (uint256);
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
    uint8 public version;

    function initialize() public initializer {
        OwnableUpgradeable.__Ownable_init();
        version = 0x1;
    }

    function approve() public {
        require(IERC20(DAI).approve(WDAI, uint256(-1)), 'approve dai failed');
        require(IERC20(CORE).approve(WCORE, uint256(-1)), 'approve core failed');
        require(IERC20(DAI).approve(ROUTER, uint256(-1)), 'approve router to spend dai failed');
        require(IERC20(CORE).approve(ROUTER, uint256(-1)), 'approve router to spend core failed');
        require(IERC20(WCORE).approve(ROUTER, uint256(-1)), 'approve router to spend wcore failed');
        require(IERC20(WDAI).approve(ROUTER, uint256(-1)), 'approve router to spend wdai failed');
    }

    function getPairInfo(address tokenA, address tokenB)
        public
        view
        returns (
            uint256 reserveA,
            uint256 reserveB,
            uint256 totalSupply
        )
    {
        IUniswapV2Pair pair = IUniswapV2Pair(UniswapV2Library.pairFor(FACTORY, tokenA, tokenB));
        totalSupply = pair.totalSupply();
        (uint256 reserves0, uint256 reserves1, ) = pair.getReserves();
        (reserveA, reserveB) = tokenA == pair.token0() ? (reserves0, reserves1) : (reserves1, reserves0);
    }

    function getBalances()
        public
        view
        returns (
            uint256 dai,
            uint256 wdai,
            uint256 core,
            uint256 wcore
        )
    {
        dai = IERC20(DAI).balanceOf(address(this));
        wdai = IERC20(WDAI).balanceOf(address(this));
        core = IERC20(CORE).balanceOf(address(this));
        wcore = IERC20(WCORE).balanceOf(address(this));
    }

    function getEthPairArbiRate(uint256 amount, uint8 fot) public view returns (uint256 arbiRate) {
        address[] memory core2weth = new address[](3);
        core2weth[0] = CORE;
        core2weth[1] = WETH;
        core2weth[2] = DAI;
        address[] memory dai2core = new address[](2);
        dai2core[0] = WDAI;
        dai2core[1] = WCORE;

        // sell CORE on CORE/eth pair
        uint256[] memory ethPairPrices = UniswapV2Library.getAmountsOut(FACTORY, amount, core2weth);
        uint256 daiOut = ethPairPrices[2] * (1000 - fot) / 1000;

        uint256[] memory daiPairPrices = UniswapV2Library.getAmountsIn(FACTORY, amount, dai2core);

        uint256 daiIn = daiPairPrices[0];
        // console.log(daiOut, daiIn);
        return daiOut > daiIn ? daiOut - daiIn : 0;
    }

    function getDaiPairArbiRate(uint256 amount, uint8 fot) public view returns (uint256 arbiRate) {
        address[] memory core2dai = new address[](2);
        core2dai[0] = WCORE;
        core2dai[1] = WDAI;

        uint256[] memory daiPairPrices = UniswapV2Library.getAmountsOut(FACTORY, amount, core2dai);
        uint256 daiOut = daiPairPrices[1] * (1000 - fot) / 1000;

        address[] memory core2weth = new address[](3);
        core2weth[0] = DAI;
        core2weth[1] = WETH;
        core2weth[2] = CORE;

        // sell CORE on CORE/eth pair

        uint256[] memory ethPairPrices = UniswapV2Library.getAmountsIn(FACTORY, amount, core2weth);

        uint256 daiIn = ethPairPrices[0];
        // console.log(daiOut, daiIn);
        return daiOut > daiIn ? daiOut - daiIn : 0;
    }

    function sellCoreOnEthPair(uint256 amount, uint256 gasFee, uint8 fot)  public onlyOwner {
        uint256 profit = getEthPairArbiRate(amount, fot);
        require(profit > gasFee, 'no profit');

        unwrapIfNecessary(CORE, WCORE, amount);


        address[] memory core2weth = new address[](3);
        core2weth[0] = CORE;
        core2weth[1] = WETH;
        core2weth[2] = DAI;
        IUniSwapRouter(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amount,
            1,
            core2weth,
            address(this),
            block.timestamp
        );

        address[] memory dai2core = new address[](2);
        dai2core[0] = WDAI;
        dai2core[1] = WCORE;

        uint256[] memory prices = UniswapV2Library.getAmountsIn(FACTORY, amount, dai2core);
        wrapIfNecessary(WDAI, prices[0]);

        IUniSwapRouter(ROUTER).swapTokensForExactTokens(amount, uint256(-1), dai2core, address(this), block.timestamp);


        // console.log('execution result', coreBalanceAfter - coreBalanceBefore, daiBalanceAfter - daiBalanceBefore);
    }

    function sellCoreOnDaiPair(uint256 amount, uint256 gasFee, uint8 fot) public onlyOwner {
        uint256 profit = getDaiPairArbiRate(amount, fot);
        require(profit > gasFee, 'no profit');

        wrapIfNecessary(WCORE, amount);

        // uint256 coreBalanceBefore = getCoreBalances();
        // uint256 daiBalanceBefore = getDaiBalances();

        address[] memory dai2core = new address[](2);
        dai2core[0] = WCORE;
        dai2core[1] = WDAI;

        // console.log('try to sell wcore');
        // console.log('WCORE balance', IERC20(WCORE).balanceOf(address(this)));
        IUniSwapRouter(ROUTER).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amount,
            0,
            dai2core,
            address(this),
            block.timestamp
        );

        // console.log('WCORE balance after sale', IERC20(WCORE).balanceOf(address(this)));
        // console.log('complete to sell wcore');

        address[] memory core2weth = new address[](3);
        core2weth[0] = DAI;
        core2weth[1] = WETH;
        core2weth[2] = CORE;

        uint256[] memory prices = UniswapV2Library.getAmountsIn(FACTORY, amount, core2weth);
        // console.log('required dai amount', prices[0]);
        unwrapIfNecessary(DAI, WDAI, prices[0]);

        IUniSwapRouter(ROUTER).swapTokensForExactTokens(amount, uint256(-1), core2weth, address(this), block.timestamp);

        // uint256 coreBalanceAfter = getCoreBalances();
        // uint256 daiBalanceAfter = getDaiBalances();

        // require(
        //     coreBalanceAfter >= coreBalanceBefore && daiBalanceAfter > daiBalanceBefore,
        //     "total asset doesn't increase"
        // );

        // console.log('execution result', coreBalanceAfter - coreBalanceBefore, daiBalanceAfter - daiBalanceBefore);
    }


    function getCoreBalances() public view returns (uint256) {
        uint256 coreBalance = IERC20(CORE).balanceOf(address(this));
        uint256 wcoreBalance = IERC20(WCORE).balanceOf(address(this));
        return coreBalance + wcoreBalance;
    }

    function getDaiBalances() public view returns (uint256) {
        uint256 daiBalance = IERC20(DAI).balanceOf(address(this));
        uint256 WDAIBalance = IERC20(WDAI).balanceOf(address(this));
        return daiBalance + WDAIBalance;
    }

    function wrapIfNecessary(address erc95Token, uint256 amount) internal {
        uint256 balance = IERC20(erc95Token).balanceOf(address(this));
        // console.log('enter wrap if necessary balance and amount', balance, amount);
        if (balance < amount) {
            // console.log('try to wrap', erc95Token, amount - balance);
            IERC95(erc95Token).wrap(address(this), amount - balance);
        }
    }

    function unwrapIfNecessary(
        address token,
        address erc95Token,
        uint256 amount
    ) internal {
        // console.log('enter unwrap if necessary');
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) {
            // console.log('try to unwrap', token, amount - balance);
            IERC95(erc95Token).unwrap(amount - balance);
        }
    }

    function getTokenBack(address token, uint256 amount) public onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, 'zero balance');
        if (amount > balance) {
            IERC20(token).transfer(ME, balance);
        } else {
            IERC20(token).transfer(ME, amount);
        }
    }
}
