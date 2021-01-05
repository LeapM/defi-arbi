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

const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const router = new Contract(ROUTER, UniV2Router.abi, provider)
const signer = new Wallet(deployer.key, provider)
const coreArbi = new Contract(COREARBI, COREArbi.abi, signer)
const initialEth = parseEther('8')
const initialDai = parseEther('20000')

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

async function getBTCBalance() {
  const wbtcInstance = getErc20Instance(WBTC, provider)
  const wbtcBalance = (await wbtcInstance.balanceOf(COREARBI)) as BigNumber
  const wwbtcInstance = getErc20Instance(WWBTC, provider)
  const wwbtcBalance = (await wwbtcInstance.balanceOf(COREARBI)) as BigNumber
  const totalBtc = wbtcBalance.add(wwbtcBalance)
  return totalBtc
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

async function withdrawProfit() {
  await coreArbi.withdrawTokens([WBTC, DAI], [ONE_BTC, parseEther('5000')], deployer.address)
}
const functionToRun = getDaiBalance
// const functionToRun = withdrawProfit
functionToRun()
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
