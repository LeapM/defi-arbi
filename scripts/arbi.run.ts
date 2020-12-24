import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import deployer from '../secret/deployer.json'
import COREArbi from '../abis/COREArbi.json'
import FeeProvider from '../abis/IFeeApprover.json'
import UniV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import { CORE, FACTORY, ROUTER, WETH, DAI, COREARBI, WDAI, WCORE, FOT } from '../constants/addresses'
import { formatUnits } from 'ethers/lib/utils'
import { exit } from 'process'
import { delay } from './utils'
const { parseEther, formatEther } = utils

const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const signer = new Wallet(deployer.key, provider)
const coreArbi = new Contract(COREARBI, COREArbi.abi, signer)
const router = new Contract(ROUTER, UniV2Router.abi, signer)
const feeProvider = new Contract(FOT, FeeProvider.abi, signer)
const gasLimit = BigNumber.from('630000')
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

enum Strategy {
  'WCORE',
  'CORE',
}
enum TradeStatus {
  'Idle',
  'Pending',
  'Completed',
  'Failed',
}
const lastTrade = {
  gasPrice: BigNumber.from(0),
  nonce: 0,
  timestamp: 0,
  tx: '',
  status: TradeStatus.Idle,
  count: 0,
}
async function executeStrategy(
  strategy: Strategy,
  amount: BigNumber,
  gasCost: BigNumber,
  fot: BigNumber,
  option: { gasPrice: BigNumber; gasLimit: BigNumber; nonce?: number }
) {
  let tx
  if (lastTrade.status == TradeStatus.Pending) {
    const waitPeriod = 1000 * 60 * 3
    const receipt = await provider.getTransactionReceipt(lastTrade.tx!)

    if (!receipt) {
      if (Date.now() - lastTrade.timestamp < waitPeriod) {
        return
      }

      if (option.gasPrice.lt(lastTrade.gasPrice.mul(105).div(100))) {
        return
      }
      option = { ...option, nonce: lastTrade.nonce }
    }

    lastTrade.status = TradeStatus.Completed
  }

  try {
    if (strategy == Strategy.CORE) {
      tx = await coreArbi.sellCoreOnEthPair(amount, gasCost, 10, option)
    }
    if (strategy == Strategy.WCORE) {
      tx = await coreArbi.sellCoreOnDaiPair(amount, gasCost, 10, option)
    }
    lastTrade.count = lastTrade.count + 1
    lastTrade.timestamp = Date.now()
    lastTrade.status = TradeStatus.Pending
    lastTrade.tx = tx.hash
    lastTrade.nonce = tx.nonce
    lastTrade.gasPrice = option.gasPrice
  } catch (error) {
    console.error('failed to send transaction', error)
  }
}

interface arbiF {
  (amount: BigNumber, fot: BigNumber): Promise<BigNumber>
}

type ArbiOption = {
  f: arbiF
  strategy: Strategy
}

async function findBestArbi(fot: BigNumber) {
  const bestArbi: { amount: BigNumber; strategy?: Strategy; profit: BigNumber } = {
    amount: BigNumber.from('0'),
    strategy: undefined,
    profit: BigNumber.from('0'),
  }
  try {
    const amounts = ['1', '1.5'].map((a) => parseEther(a))
    const options: ArbiOption[] = [
      { f: coreArbi.getDaiPairArbiRate, strategy: Strategy.WCORE },
      {
        f: coreArbi.getEthPairArbiRate,
        strategy: Strategy.CORE,
      },
    ]
    for (let amount of amounts) {
      for (let option of options) {
        const profit = await option.f(amount, fot)
        if (profit.gt(0)) {
          console.log(`profit: ${formatEther(profit)} amount: ${formatEther(amount)}, strategy: ${option.strategy}`)
        }
        if (profit.gt(bestArbi.profit)) {
          bestArbi.profit = profit
          bestArbi.amount = amount
          bestArbi.strategy = option.strategy
        }
      }
    }
  } finally {
    return bestArbi
  }
}
async function runCoreArbi() {
  while (true) {
    try {
      const fot = await feeProvider.feePercentX100()
      const gasPrice = await provider.getGasPrice()
      console.log(
        `${new Date().toLocaleString()} - gas price: ${formatUnits(gasPrice, 'gwei')} fot: ${formatUnits(fot, 'wei')}`
      )
      const ethPrice = await getEthPrice()
      const gasCost = gasPrice.mul(gasLimit).mul(ethPrice).div(parseEther('1'))
      const option = {
        gasPrice: gasPrice.mul(102).div(100),
        gasLimit,
      }
      const arbiPlan = await findBestArbi(fot)
      if (arbiPlan.profit.gt(gasCost)) {
        await executeStrategy(arbiPlan.strategy!, arbiPlan.amount, gasCost, fot, option)
      }
      await delay(20000)
    } catch (error) {
      console.error(error)
    }
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
