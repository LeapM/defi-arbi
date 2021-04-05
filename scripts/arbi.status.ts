import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import deployer from '../secret/deployer.json'
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
const { parseEther, formatEther, formatUnits } = utils

// const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const provider = new providers.AlchemyProvider(undefined, 'P6b7PduZEpsHlatVROjGcVGQF7CqS_S0')
const router = new Contract(ROUTER, UniV2Router.abi, provider)
const signer = new Wallet(deployer.key, provider)
const coreArbi = new Contract(COREARBI, COREArbi.abi, signer)
const initialEth = parseEther('8')
const initialDai = parseEther('20000')
const initialWeth = parseEther('20')
const currentCombined = '23.6543529805'
async function getEthPrice() {
  const [buyPrice] = await router.getAmountsIn(parseEther('1'), [DAI, WETH])
  return buyPrice
}

async function getBtcPriceInEth() {
  const [buyPrice] = await router.getAmountsIn(ONE_BTC, [WETH, WBTC])
  return buyPrice
}
async function getEtherBalance() {
  const balance = await provider.getBalance(BOT)
  return balance
}
async function getWEtherBalance() {
  const balance = await provider.getBalance(BOT)
  const wethInstance = getErc20Instance(WETH, provider)
  const wethBalance = (await wethInstance.balanceOf(BOT)) as BigNumber
  return [balance, wethBalance]
}

async function getBTCBalance() {
  const wbtcInstance = getErc20Instance(WBTC, provider)
  const wbtcBalance = (await wbtcInstance.balanceOf(COREARBI)) as BigNumber
  const wbtcBalanceBot = (await wbtcInstance.balanceOf(BOT)) as BigNumber
  const wwbtcInstance = getErc20Instance(WWBTC, provider)
  const wwbtcBalance = (await wwbtcInstance.balanceOf(COREARBI)) as BigNumber
  const wwbtcBalanceBot = (await wwbtcInstance.balanceOf(BOT)) as BigNumber
  const totalBtc = wbtcBalance.add(wwbtcBalance).add(wbtcBalanceBot).add(wwbtcBalanceBot)
  return totalBtc
}
async function getDaiBalance() {
  const daiInstance = getErc20Instance(DAI, provider)
  const daiBalance = (await daiInstance.balanceOf(COREARBI)) as BigNumber
  const daiBalanceBot = (await daiInstance.balanceOf(BOT)) as BigNumber
  const wdaiInstance = getErc20Instance(WDAI, provider)
  const wdaiBalance = (await wdaiInstance.balanceOf(COREARBI)) as BigNumber
  const wdaiBalanceBot = (await wdaiInstance.balanceOf(BOT)) as BigNumber
  const totalDai = daiBalance.add(daiBalanceBot).add(wdaiBalance).add(wdaiBalanceBot)
  const daiProfit = totalDai.sub(initialDai)
  const ethPrice = await getEthPrice()
  const profitInEth = daiProfit.mul(parseEther('1')).div(ethPrice)
  const leftEth = await getEtherBalance()
  const totalBtc = await getBTCBalance()
  const btcPriceInEth = await getBtcPriceInEth()
  const btcInEth = totalBtc.mul(btcPriceInEth).div(ONE_BTC)
  const allEth = profitInEth.add(leftEth).add(btcInEth)

  console.log(
    `daiProfit: ${formatEther(daiProfit)}, btcProfit: ${formatUnits(totalBtc.mul(10), 'gwei')} ethPrice: ${formatEther(
      ethPrice
    )} daiToEthProfit: ${formatEther(profitInEth)}, btcToEthProfit:${formatEther(btcInEth)} , leftEth: ${formatEther(
      leftEth
    )} totalEth: ${formatEther(allEth)}, profit: ${formatProfit(initialEth, allEth)}`
  )
}
function formatProfit(initialEth: BigNumber, currentBalance: BigNumber) {
  return initialEth.gt(currentBalance)
    ? '-' + formatEther(initialEth.sub(currentBalance))
    : '+' + formatEther(currentBalance.sub(initialEth))
}

async function getStatus() {
  const initial = parseEther('23.6543529805')
  const [eth, weth] = await getWEtherBalance()
  const current = eth.add(weth)
  console.log(
    `eth: ${formatEther(eth)}, weth: ${formatEther(weth)}, current: ${formatEther(current)}, profit: ${formatEther(
      current.sub(initial)
    )}`
  )
}

async function getCoreBalance() {
  const wbtcInstance = getErc20Instance(CORE, provider)
  const wbtcBalance = (await wbtcInstance.balanceOf(COREARBI)) as BigNumber
  const wcoreInstance = getErc20Instance(WCORE, provider)
  const wcoreBalance = (await wcoreInstance.balanceOf(COREARBI)) as BigNumber
  console.log(formatEther(wcoreBalance))
}
async function withdrawProfit() {
  await coreArbi.withdrawTokens([WCORE, CORE], [ethers.constants.MaxUint256, ethers.constants.MaxUint256], BOT)
}
const functionToRun = withdrawProfit
// const functionToRun = withdrawProfit
functionToRun()
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
