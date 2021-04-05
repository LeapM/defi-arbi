import { BigNumber, Contract, providers, Wallet } from 'ethers'
import { familystake } from '../secret/wallet.json'
import { formatEther, formatUnits, parseEther, parseUnits } from 'ethers/lib/utils'
import uniRouter02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { ROUTER, WETH, FEIUniPenality, FEIETHPair, FEIRouter } from '../constants/addresses'
import FeiAbi from '../abis/feiincentive'
import FeiRouterAbi from '../abis/feiRouter'
import { delay } from './utils'

const provider = new providers.AlchemyProvider(undefined, 'P6b7PduZEpsHlatVROjGcVGQF7CqS_S0')

const signer = new Wallet(familystake.key, provider)

const provider2 = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const signer2 = new Wallet(familystake.key, provider2)
const penalityContract = new Contract(FEIUniPenality, FeiAbi, provider)

let isCalled = false

const checkFei = async (amountIn: BigNumber) => {
  try {
    // const ethBalance = await signer.getBalance()
    // setEthBalance(formatEther(ethBalance))
    const penalty = (await penalityContract.getSellPenalty(amountIn))[0]
    console.log(`penalty ${formatEther(penalty)} , net after penalty ${formatEther(amountIn.sub(penalty))}`)
    const reserves = await penalityContract.getReserves()
    const [reserverIn, reserveOut] = reserves
    const amountOut = getAmountOut(amountIn.sub(penalty), reserverIn, reserveOut)
    console.log(
      formatEther(reserverIn),
      formatEther(reserveOut),
      formatEther(amountOut),
      new Date().toLocaleTimeString()
    )
    return amountOut
  } catch (e) {
    console.error(e)
    return
  }
}
const run = async () => {
  const MINETH = '126'
  const GASLIMIT = '550000'
  const GASPRICE = '1000'
  const count = await signer.getTransactionCount()
  const feiAmount = parseUnits('278497266236934505385223', 'wei')
  const targetEth = parseEther(MINETH).mul(102).div(100)
  while (!isCalled) {
    const amountOut = await checkFei(feiAmount)
    if (amountOut && amountOut.gt(targetEth)) {
      console.log('quite')
      isCalled = true
      await getRich(feiAmount, parseEther(MINETH), GASLIMIT, GASPRICE, count)
    }
    await delay(7000)
  }
}

async function getRich(feiAmount: BigNumber, minEth: BigNumber, gasLimit: string, gasPrice: string, nonce: number) {
  const feiAddress = '0x956F47F50A910163D8BF957Cf5846D573E7f87CA'
  const router = new Contract(FEIRouter, FeiRouterAbi, signer)

  console.log(
    `sell ${formatEther(feiAmount)} gasLimit ${gasLimit} gasprice ${gasPrice}, nonce ${nonce},for minimum ${formatEther(
      minEth
    )}`
  )
  const override = {
    gasPrice: parseUnits(gasPrice, 'gwei'),
    gasLimit: parseUnits(gasLimit, 'wei'),
    nonce: nonce,
  }
  const order1 = router
    .connect(signer)
    .sellFei(feiAmount.div(2), feiAmount, minEth, signer.address, Math.round(Date.now() / 100 + 120), override)
  order1.then(console.log).catch(console.error)

  console.log('processing order1')

  const order2 = router
    .connect(signer2)
    .sellFei(feiAmount.div(2), feiAmount, minEth, signer.address, Math.round(Date.now() / 100 + 120), override)
  order2.then(console.log).catch(console.error)

  console.log('processing order2')
}

function getAmountOut(inAmount: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber) {
  const amountInWithFee = inAmount.mul(997)
  const numerator = amountInWithFee.mul(reserveOut)
  const denominator = reserveIn.mul(1000).add(amountInWithFee)
  const amountOut = numerator.div(denominator)
  return amountOut
}

run()
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
