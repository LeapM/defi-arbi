import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import deployer from '../secret/deployer.json'
import COREArbi from '../artifacts/contracts/COREArbi.sol/COREArbi.json'
import UniV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import { CORE, FACTORY, ROUTER, WETH, DAI, COREARBI, WDAI, WCORE } from '../constants/addresses'
const { parseEther, formatEther } = utils

const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const signer = new Wallet(deployer.key, provider)
const coreArbi = new Contract(COREARBI, COREArbi.abi, signer)
const router = new Contract(ROUTER, UniV2Router.abi, signer)
const gasLimit = BigNumber.from('630000')
const lastTrade = {
  gasPrice: 0,
  nounce: 0,
  timestamp: 0,
  tx: '',
  status: '',
  count: 0,
}
async function sellCoreProfit(amount: ethers.BigNumber) {
  const [, , sellCore] = await router.getAmountsOut(amount, [CORE, WETH, DAI])
  const [buyWCore] = await router.getAmountsIn(amount, [WDAI, WCORE])
  const profit = sellCore.gt(buyWCore) ? formatEther(sellCore.sub(buyWCore)) : '-' + formatEther(buyWCore.sub(sellCore))
  return profit
}

async function sellWCoreProfit(amount: ethers.BigNumber) {
  const [, sellPrice] = await router.getAmountsOut(amount, [WCORE, WDAI])
  // console.log('dai sell wcore price', formatEther(sellPrice))
  const [buyPrice] = await router.getAmountsIn(amount, [DAI, WETH, CORE])
  // console.log('dai buy core price', formatEther(buyPrice))
  const profit = sellPrice.gt(buyPrice)
    ? formatEther(sellPrice.sub(buyPrice))
    : '-' + formatEther(buyPrice.sub(sellPrice))
  return profit
}

async function getEthPrice() {
  const [buyPrice] = await router.getAmountsIn(parseEther('1'), [DAI, WETH])
  return buyPrice
}

async function getBalances() {
  const [dai, wdai, core, wcore] = await coreArbi.getBalances()
  console.log(
    `dai bal: ${formatEther(dai)}, wdai bal: ${formatEther(wdai)}, core bal: ${formatEther(
      core
    )}, wcore bal: ${formatEther(wcore)}`
  )
}
async function approve() {
  await coreArbi.approve()
}
async function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

enum Strategy {
  'WCORE',
  'CORE',
}
async function executeStrategy(
  strategy: Strategy,
  amount: BigNumber,
  gasCost: BigNumber,
  option: { gasPrice: BigNumber; gasLimit: BigNumber }
) {
  let tx
  if (lastTrade.count > 20) {
    console.log('reach maximum trading acount', 'skip')
  }
  if (lastTrade.timestamp) {
    if (lastTrade.status == 'pending') {
      const receipt = await provider.getTransactionReceipt(lastTrade.tx!)
      if (!receipt) {
        console.log('pending transaction, skip executing')
        return
      }

      lastTrade.status = 'completed'
    }
  }
  if (strategy == Strategy.CORE) {
    tx = await coreArbi.sellCoreOnEthPair(amount, gasCost, 10, option)
  }
  if (strategy == Strategy.WCORE) {
    tx = await coreArbi.sellCoreOnDaiPair(amount, gasCost, 10, option)
  }
  lastTrade.count = lastTrade.count + 1
  lastTrade.timestamp = Date.now()
  lastTrade.status = 'pending'
  lastTrade.tx = tx.hash
}
async function runCoreArbi() {
  while (true) {
    console.log('running checking at:', new Date().toLocaleString())
    const gasPrice = await provider.getGasPrice()
    const ethPrice = await getEthPrice()
    const gasCost = gasPrice.mul(gasLimit).mul(ethPrice).div(parseEther('1'))
    const amount = parseEther('1')
    const daiProfit = await coreArbi.getDaiPairArbiRate(amount, 10)
    const option = {
      gasPrice: gasPrice.mul(102).div(100),
      gasLimit,
    }
    if (daiProfit.gt(gasCost)) {
      console.log('dai profit', formatEther(daiProfit), formatEther(gasCost))
      await executeStrategy(Strategy.WCORE, amount, gasCost, option)
    }
    const ethProfit = await coreArbi.getEthPairArbiRate(amount, 10)

    if (ethProfit.gt(gasCost)) {
      console.log('eth profit', formatEther(ethProfit), formatEther(gasCost))
      await executeStrategy(Strategy.CORE, amount, gasCost, option)
    }
    await delay(20000)
  }
}

runCoreArbi()
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
