pragma solidity ^0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import 'hardhat/console.sol';
import './SafeMath.sol';

interface IChi {
    function freeFromUpTo(address from, uint256 value) external returns (uint256);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

}

interface IERC95 {
    /// public function to unwrap
    function unwrap(uint256 amt) external;

    function wrap(address to, uint256 amt) external;
}

contract UniArbi {
    using SafeMath for uint256;

    address constant CORE = 0x62359Ed7505Efc61FF1D56fEF82158CcaffA23D7;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; 

    address constant CDAI = 0x00a66189143279b6DB9b77294688F47959F37642;
    address constant CCORE = 0x17B8c1A92B66b1CF3092C5d223Cb3a129023b669;
    address constant CBTC = 0x7b5982dcAB054C377517759d0D2a3a5D02615AB8;
    IChi constant chi = IChi(0x0000000000004946c0e9F43F4Dee607b0eF1fA1c);

    modifier discountCHI {
        _;
        if (tx.gasprice > 120e9) {
            chi.freeFromUpTo(msg.sender, 6);
        }
    }

    function approve(address[] calldata _tokens, address[] calldata _spenders ) external {
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(IERC20(_tokens[i]).approve(_spenders[i], uint256(-1)), "failed to approve");
        }
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure 
    returns (uint amountOut) {
        uint amountInWithFee = amountIn.mul(997);
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }
    
    function getAmountsOut(uint amount, address[] memory pairs, bytes32 meta) public view 
    returns (uint[] memory amounts) {
        amounts = new uint[](pairs.length + 1);
        amounts[0] = amount;
        for (uint i; i < pairs.length; i++) {
            (uint reserveIn, uint reserveOut,) = IUniswapV2Pair(pairs[i]).getReserves();
            bool isReverse = isPairReverse(uint8(meta[i]));
            if(isReverse) {
               amounts[i + 1] = getAmountOut(amounts[i], reserveOut, reserveIn);
            }
            else {
                amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);    
            }       
        }
    }

    function execute(address[] calldata pairs, bytes32 meta ) discountCHI external {

        uint ethAmount = uint(uint8(meta[31]) * 1e18);
        uint[] memory amounts = getAmountsOut(ethAmount, pairs, meta);
        uint output = amounts[amounts.length - 1];
        uint256 initialWethBalance = IERC20(WETH).balanceOf(address(this));
        // transfer weth to first pair
        IERC20(WETH).transferFrom(msg.sender, pairs[0], ethAmount);

        uint8 count = uint8(pairs.length);
        uint8 maxIndex = count - 1;

        for (uint8 i = 0; i < count; i++) {
            IUniswapV2Pair pair = IUniswapV2Pair(pairs[i]);
            uint8 flag = uint8(meta[i]);
            bool isReverse = isPairReverse(flag);
            bool isDirect = isDirect(flag);
            address destination = i == maxIndex ? msg.sender: pairs[i + 1];

            uint amount= amounts[i+1];
            if(isDirect) {
                if(isReverse) {
                    pair.swap(amount, 0, destination, bytes(""));
                }
                else {
                    pair.swap(0, amount, destination, bytes(""));
                }
                continue;
            }
            // unwrap or wrap required, send the token to self
            if(isReverse) {
                pair.swap(amount, 0, address(this), bytes(""));
            }
            else {
                pair.swap(0, amount, address(this), bytes(""));
            }
            
            flag = flag >> 1;
            bool iscDaiWrap = iscDaiWrap(flag);
            if (iscDaiWrap) {
                wrap(CDAI, amount, destination);
                continue;
            } 

            bool iscDaiUnwrap = iscDaiUnwrap(flag);
            if (iscDaiUnwrap) {
                unwrap(CDAI, amount);
                IERC20(DAI).transfer(destination, amount);
                continue;
            } 

            bool iscBTCWrap = iscBTCWrap(flag);
            if (iscBTCWrap) {
                wrap(CBTC, amount, destination);
                continue;
            } 

            bool iscBTCUnwrap = iscBTCUnwrap(flag);
            if (iscBTCUnwrap) {
                unwrap(CBTC, amount);
                IERC20(WBTC).transfer(destination, amount);
                continue;
            }

            bool iscCoreWrap= iscCoreWrap(flag);
            if (iscCoreWrap) {
                wrap(CCORE, amount, destination);
                continue;
            } 

            bool iscCoreUnwrap = iscCoreUnwrap(flag);
            if (iscCoreUnwrap) {
                unwrap(CCORE, amount);
                IERC20(CORE).transfer(destination, amount);
                continue;
            }
            require(1 == 0, "wrong flag");
        }
    }

    function isPairReverse (uint8 flag) internal pure returns (bool ) {
        return  flag & 1 == 1;
    }

    function isDirect (uint8 flag) internal pure returns (bool ) {
        return (flag >> 1) & 7 == 0;
    }

    function iscBTCWrap (uint8 flag) internal pure returns (bool) {
        return flag & 7 == 1;
    }
    
    function iscBTCUnwrap (uint8 flag) internal pure returns (bool ) {
        return flag & 7 == 2;
    }

    function iscDaiWrap(uint8 flag) internal pure returns (bool isWrap) {
        return flag & 7 == 3;
    }

    function iscDaiUnwrap(uint8 flag) internal pure returns (bool isWrap) {
        return flag & 7 == 4;
    }

    function iscCoreWrap(uint8 flag) internal pure returns (bool isWrap) {

        return flag & 7 == 5;
    }

    function iscCoreUnwrap(uint8 flag) internal pure returns (bool isWrap) {
        return flag & 7 == 6;
    }

    function wrap(address erc95Token, uint256 amount, address destination) internal {
        IERC95(erc95Token).wrap(destination, amount);
    }

    function unwrap(
        address erc95Token,
        uint256 amount
    ) internal {
        IERC95(erc95Token).unwrap(amount);
    }

}
