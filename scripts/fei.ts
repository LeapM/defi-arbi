import { BigNumber, Contract, providers, Wallet } from 'ethers'
import { familystake } from '../secret/wallet.json'
import { formatEther, formatUnits, parseEther, parseUnits } from 'ethers/lib/utils'
import uniRouter02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { ROUTER, WETH, FEIUniPenality, FEIETHPair } from '../constants/addresses'
import FeiAbi from '../abis/feiincentive'

const provider = new providers.AlchemyProvider(undefined, 'P6b7PduZEpsHlatVROjGcVGQF7CqS_S0')

const signer = new Wallet(familystake.key, provider)

const provider2 = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const signer2 = new Wallet(familystake.key, provider2)

const feiAmount = parseUnits('279497266236934505385220', 'wei')
const penalityContract = new Contract(FEIUniPenality, FeiAbi, provider)

const MINETH = '125'
const GASLIMIT = '650000'
const GASPRICE = '1000'
let isCalled = false

const checkFei = async () => {
  if (isCalled) {
    return
  }
  try {
    const count = await signer.getTransactionCount()
    // const ethBalance = await signer.getBalance()
    // setEthBalance(formatEther(ethBalance))
    const penalty = (await penalityContract.getSellPenalty(feiAmount))[0]
    console.log(`penalty ${formatEther(penalty)} , net after penalty ${formatEther(feiAmount.sub(penalty))}`)
    const reserves = await penalityContract.getReserves()
    const [reserverIn, reserveOut] = reserves
    const amountOut = getAmountOut(feiAmount.sub(penalty), reserverIn, reserveOut)
    const targetEth = parseEther(MINETH).mul(101).div(100)
    console.log(
      formatEther(reserverIn),
      formatEther(reserveOut),
      formatEther(amountOut),
      formatEther(targetEth),
      new Date().toLocaleTimeString()
    )
    if (!isCalled && amountOut.gt(targetEth)) {
      console.log('quite')
      isCalled = true
      await getRich(MINETH, GASLIMIT, GASPRICE, count)
    }
  } catch (e) {}
}
const run = () => setInterval(checkFei, 10000)
async function getRich(minEth: string, gasLimit: string, gasPrice: string, nonce: number) {
  const feiAddress = '0x956F47F50A910163D8BF957Cf5846D573E7f87CA'
  const router = new Contract(ROUTER, uniRouter02.abi, signer)
  const minAmount = parseEther(minEth)

  console.log(
    `sell ${formatEther(feiAmount)} gasLimit ${gasLimit} gasprice ${gasPrice}, nonce ${nonce},for minimum ${formatEther(
      minAmount
    )}`
  )
  const override = {
    gasPrice: parseUnits(gasPrice, 'gwei'),
    gasLimit: parseUnits(gasLimit, 'wei'),
    nonce: nonce,
  }
  //swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
  const order1 = router
    .connect(signer)
    .swapExactTokensForETH(
      feiAmount,
      minAmount,
      [feiAddress, WETH],
      signer.address,
      Math.round(Date.now() / 100 + 120),
      override
    )
  order1.then(console.log).catch(console.error)

  console.log('processing order1')

  const order2 = router
    .connect(signer2)
    .swapExactTokensForETH(
      feiAmount,
      minAmount,
      [feiAddress, WETH],
      signer.address,
      Math.round(Date.now() / 100 + 120),
      override
    )
  order2.then(console.log).catch(console.error)

  console.log('processing order2')

  console.log('wait for 6 seconds....')
}

//

//   function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
//       require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
// require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
// uint amountInWithFee = amountIn.mul(997);
// uint numerator = amountInWithFee.mul(reserveOut);
// uint denominator = reserveIn.mul(1000).add(amountInWithFee);
// amountOut = numerator / denominator;
// }

function getAmountOut(inAmount: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber) {
  const amountInWithFee = inAmount.mul(997)
  const numerator = amountInWithFee.mul(reserveOut)
  const denominator = reserveIn.mul(1000).add(amountInWithFee)
  const amountOut = numerator.div(denominator)
  return amountOut
}

run()
