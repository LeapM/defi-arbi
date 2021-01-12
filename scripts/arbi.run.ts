import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import deployer from '../secret/deployer.json'
import COREArbi from '../abis/COREArbi.json'
import { abi as chiAbi } from '../abis/chi.json'
import FeeProvider from '../abis/IFeeApprover.json'
import UniV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import { CORE, FACTORY, ROUTER, WETH, DAI, COREARBI, WDAI, WCORE, FOT, WBTC, WWBTC, CHI } from '../constants/addresses'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { delay } from './utils'
import { ONE_BTC } from '../constants/baseUnits'
const { parseEther, formatEther } = utils

const provider = new providers.AlchemyProvider(undefined, 'P6b7PduZEpsHlatVROjGcVGQF7CqS_S0')
// const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const signer = new Wallet(deployer.key, provider)
const coreArbi = new Contract(COREARBI, COREArbi.abi, signer)
const chi = new Contract(CHI, chiAbi, signer)
const router = new Contract(ROUTER, UniV2Router.abi, signer)
const gasLimit = BigNumber.from('630000')
let failureCounter = 0
const arbiPlans = [
  {
    sellPath: [CORE, WETH, DAI],
    buyPath: [WDAI, WCORE],
    profitUnit: 'DAI',
    name: 'eth-dai arbi',
  },
  {
    sellPath: [WCORE, WDAI],
    buyPath: [DAI, WETH, CORE],
    profitUnit: 'DAI',
    name: 'dai-eth arbi',
  },
  {
    sellPath: [CORE, WETH, WBTC],
    buyPath: [WWBTC, CORE],
    profitUnit: 'BTC',
    name: 'eth-btc arbi',
  },
  {
    sellPath: [CORE, WWBTC],
    buyPath: [WBTC, WETH, CORE],
    profitUnit: 'BTC',
    name: 'btc-eth arbi',
  },
]

type ArbiPlan = typeof arbiPlans[0]
async function getEthPrice() {
  const [buyPrice] = await router.getAmountsIn(parseEther('1'), [DAI, WETH])
  return buyPrice
}
async function getBtcPrice() {
  const [buyPrice] = await router.getAmountsIn(ONE_BTC, [DAI, WETH, WBTC])
  return buyPrice
}

enum TransactionStatus {
  Pending,
  Completed,
}

const lastTrade: Trade = {
  gasPrice: BigNumber.from(0),
  nonce: 0,
  timestamp: 0,
  tx: '',
  count: 0,
  status: TransactionStatus.Completed,
}

type Trade = {
  gasPrice: BigNumber
  nonce: number
  timestamp: number
  tx: string
  count: number
  status: TransactionStatus
}
async function executeStrategy(
  amount: BigNumber,
  gasCost: BigNumber,
  plan: ArbiPlan,
  option: { gasPrice: BigNumber; gasLimit: BigNumber }
) {
  const transatcionCountMined = await signer.getTransactionCount()
  const override = { ...option, gasLimit: BigNumber.from('830000'), nonce: transatcionCountMined }

  console.log(
    `executing strategy ${plan.name} at nonce ${override.nonce},
    gasPrice: ${formatUnits(override.gasPrice, 'gwei')},
    cost : ${plan.profitUnit === 'BTC' ? formatUnits(gasCost.mul(10), 'gwei') : formatEther(gasCost)}
    at ${new Date().toLocaleString('en-US', { timeZone: 'Australia/Perth' })}`
  )
  try {
    const tx = await coreArbi.executeArbi(plan.sellPath, plan.buyPath, amount, gasCost, override)

    lastTrade.count = lastTrade.count + 1
    lastTrade.timestamp = Date.now()
    lastTrade.tx = tx.hash
    lastTrade.nonce = tx.nonce
    lastTrade.gasPrice = option.gasPrice
    lastTrade.status = TransactionStatus.Pending
    console.log(`strategy executed with tx ${lastTrade.tx}`)
  } catch (error) {
    console.error('failed to send transaction', error)
  }
}

async function findBestArbi(ethPrice: BigNumber, btcPrice: BigNumber) {
  const bestArbi = {
    amount: BigNumber.from('0'),
    plan: arbiPlans[0],
    profitInDai: BigNumber.from('0'),
    profit: BigNumber.from('0'),
  }

  try {
    const amount = parseEther('3')
    const requries = arbiPlans.map(async (plan) => {
      const profit = (await coreArbi.getArbiProfit(plan.sellPath, plan.buyPath, amount)) as BigNumber
      const profitInDai = plan.profitUnit === 'BTC' ? profit.mul(btcPrice).div(ONE_BTC) : profit
      return { profit, profitInDai, plan }
    })
    const planResults = await Promise.all(requries)
    planResults.forEach((result) => {
      const { profit, profitInDai, plan } = result
      if (profitInDai.gt(0)) {
        console.log(
          `profit: ${formatEther(profitInDai)} amount: ${formatEther(amount)}, strategy: ${
            plan.name
          } at: ${new Date().toLocaleString('en-US', { timeZone: 'Australia/Perth' })}`
        )
      }
      if (profitInDai.gt(bestArbi.profitInDai)) {
        bestArbi.profitInDai = profitInDai
        bestArbi.profit = profit
        bestArbi.amount = amount
        bestArbi.plan = { ...plan }
      }
    })
  } catch {}
  return bestArbi
}

async function isLastTradeCompleted(trade: Trade) {
  if (trade.status === TransactionStatus.Completed) {
    return true
  }
  const txResult = await provider.getTransaction(lastTrade.tx)

  if (!txResult) {
    // in case the tx was replaced by another tx, but lastTrade still have the old tx
    trade.status = TransactionStatus.Completed
    return true
  }

  if (txResult.confirmations > 0) {
    trade.status = TransactionStatus.Completed
    const receipt = await provider.getTransactionReceipt(lastTrade.tx)
    if (receipt.status == 0) {
      failureCounter++
      console.log('increase failure counter to ', failureCounter)
    } else {
      failureCounter = 0
    }
    return true
  }

  return false
}

async function runCoreArbi() {
  while (true) {
    try {
      await delay(4000)
      const completed = await isLastTradeCompleted(lastTrade)
      if (!completed) {
        // check how old the transaction is
        const timeSinceSent = Date.now() - lastTrade.timestamp
        const isTimeOut = timeSinceSent > 40 * 1000 * 1
        if (!isTimeOut) {
          continue
        }
      }

      if (failureCounter > 2) {
        console.error('reverted 3 times in a row, investigate')
        continue
      }
      const ethPrice = await getEthPrice()
      const btcPrice = await getBtcPrice()

      let gasPrice = await provider.getGasPrice()
      if (lastTrade.status === TransactionStatus.Pending) {
        // the base gas price takes too long to execute, increase it by 10%
        gasPrice = gasPrice.mul(110).div(100)
        // icrease the last executing gas price by 20%
        const minimumGasPrice = lastTrade.gasPrice.mul(120).div(100)
        if (gasPrice.lt(minimumGasPrice)) {
          console.log(
            `increase gas price from ${formatUnits(gasPrice, 'gwei')} to ${formatUnits(minimumGasPrice, 'gwei')}`
          )
          gasPrice = minimumGasPrice
        }
      }

      let gasCost = gasPrice.mul(gasLimit).mul(ethPrice).div(parseEther('1'))
      if (lastTrade.status === TransactionStatus.Pending) {
        // reduce the gascost and hope the transaction won't revert
        gasCost = gasCost.mul(70).div(100)
      }

      const option = {
        gasPrice: gasPrice.mul(102).div(100), // increase gas fee 102% to fast the comfirmation
        gasLimit,
      }

      const arbiPlan = await findBestArbi(ethPrice, btcPrice)
      if (arbiPlan.profitInDai.gt(gasCost)) {
        if (lastTrade.status === TransactionStatus.Pending) {
          console.log(
            `pending transaction ${lastTrade.tx} was sent ${
              (Date.now() - lastTrade.timestamp) / 1000
            } seconds ago. replaced it`
          )
        }
        const cost = arbiPlan.profit.mul(gasCost).div(arbiPlan.profitInDai).mul(80).div(100)
        await executeStrategy(arbiPlan.amount, cost, arbiPlan.plan, option)
      }
    } catch (error) {
      // console.error(error)
    }
  }
}

const functionToRun = runCoreArbi
functionToRun()
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
