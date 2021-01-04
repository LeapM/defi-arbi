import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import COREArbi from '../abis/COREArbi.json'
import UniV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import {
  CORE,
  FACTORY,
  ROUTER,
  WETH,
  DAI,
  COREARBI,
  WDAI,
  WCORE,
  FOT,
  WBTC,
  WWBTC,
  CHI,
  BOT,
} from '../constants/addresses'
import { ONE_BTC } from '../constants/baseUnits'
import { getErc20Instance } from './utils'
import { Signer } from 'crypto'
const { parseEther, formatEther } = utils

const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const router = new Contract(ROUTER, UniV2Router.abi, provider)
const initialEth = parseEther('6')
const initialDai = parseEther('20000')

async function getEthPrice() {
  const [buyPrice] = await router.getAmountsIn(parseEther('1'), [DAI, WETH])
  return buyPrice
}

async function getEtherBalance() {
  const balance = await provider.getBalance(BOT)
  return balance
}

async function getDaiBalance() {
  const daiInstance = getErc20Instance(DAI, provider)
  const daiBalance = (await daiInstance.balanceOf(COREARBI)) as BigNumber
  const wdaiInstance = getErc20Instance(WDAI, provider)
  const wdaiBalance = (await wdaiInstance.balanceOf(COREARBI)) as BigNumber
  const daiProfit = daiBalance.add(wdaiBalance).sub(initialDai)
  const ethPrice = await getEthPrice()
  const profitInEth = daiProfit.mul(parseEther('1')).div(ethPrice)
  const leftEth = await getEtherBalance()
  const allEth = profitInEth.add(leftEth)
  console.log(
    `daiProfit: ${formatEther(daiProfit)} ethPrice: ${formatEther(ethPrice)} ethProfit: ${formatEther(
      profitInEth
    )} leftEth: ${formatEther(leftEth)} totalEth: ${formatEther(allEth)}, profit: ${formatProfit(initialEth, allEth)}`
  )
}
function formatProfit(initialEth: BigNumber, currentBalance: BigNumber) {
  return initialEth.gt(currentBalance)
    ? '-' + formatEther(initialEth.sub(currentBalance))
    : '+' + formatEther(currentBalance.sub(initialEth))
}

const functionToRun = getDaiBalance
functionToRun()
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
