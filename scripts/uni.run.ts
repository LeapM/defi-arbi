import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import deployer from '../secret/deployer.json'
import UniArbi from '../abis/UniArbi.json'
import { abi as chiAbi } from '../abis/chi.json'
import { abi as erc20Abi } from '../abis/erc20.json'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { delay } from './utils'
import { cDaiCCorePair, coreCBtcPair, coreWEthPair, DaiWethPair, wBtcWethPair } from '../constants/uniPairs'
import { CHI, CORE, DAI, ROUTER, WBTC, WCORE, WDAI, WETH, WWBTC } from '../constants/addresses'
import axios from 'axios'
import { getgid } from 'process'
const { parseEther, formatEther } = utils
const contractAddr = '0xcbae7EE55b3D4497907a25B2733C1b7bFe33E6d4'
const provider = new providers.AlchemyProvider(undefined, 'P6b7PduZEpsHlatVROjGcVGQF7CqS_S0')
// const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const signer = new Wallet(deployer.key, provider)
const uniArbi = new Contract(contractAddr, UniArbi.abi, signer)
let failureCounter = 0
const amountForMeta = 15
const metaForEthBtc = new Array(32).fill(0)
metaForEthBtc[31] = amountForMeta
metaForEthBtc[0] = 0b1
metaForEthBtc[1] = 0b100

const metaForBtcEth = new Array(32).fill(0)
metaForBtcEth[31] = amountForMeta
// get wbtc, wrap it into cbtc, and reverse the order
metaForBtcEth[0] = 0b11
// reverse to get core
metaForBtcEth[1] = 0b1
// normal order to get eth
metaForBtcEth[2] = 0b0

const metaForDaiEth = new Array(32).fill(0)
metaForDaiEth[31] = amountForMeta
metaForDaiEth[30] = 0b1
// reverse to get dai and wrap it into cdai
metaForDaiEth[0] = 0b111
// get ccore and unwrap it into core
metaForDaiEth[1] = 0b1100
// normal order to get eth
metaForDaiEth[2] = 0b0

const metaForEthDai = new Array(32).fill(0)
metaForEthDai[31] = amountForMeta
// reverse to get CORE and wrap it into cCore
metaForEthDai[0] = 0b1011
// reverse to get CDAI and unwrap it into dai
metaForEthDai[1] = 0b1001
// normal order to get eth
metaForEthDai[2] = 0b0
const arbiPlans = [
  {
    pairs: [coreWEthPair.address, coreCBtcPair.address, wBtcWethPair.address],
    meta: metaForEthBtc,
    name: 'eth-btc',
    gas: BigNumber.from('400000'),
  },
  {
    pairs: [wBtcWethPair.address, coreCBtcPair.address, coreWEthPair.address],
    meta: metaForBtcEth,
    name: 'btc-eth',
    gas: BigNumber.from('400000'),
  },
  {
    pairs: [DaiWethPair.address, cDaiCCorePair.address, coreWEthPair.address],
    meta: metaForDaiEth,
    name: 'dai-eth',
    feeApplied: true,
    gas: BigNumber.from('450000'),
  },
  {
    pairs: [coreWEthPair.address, cDaiCCorePair.address, DaiWethPair.address],
    meta: metaForEthDai,
    name: 'eth-dai',
    gas: BigNumber.from('450000'),
  },
]

type ArbiPlan = typeof arbiPlans[0]

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
async function executeStrategy(plan: ArbiPlan, option: { gasPrice: BigNumber }) {
  const transatcionCountMined = await signer.getTransactionCount()
  const override = { ...option, gasLimit: BigNumber.from('830000'), nonce: transatcionCountMined }

  console.log(
    `executing strategy ${plan.name} at nonce ${override.nonce},
    gasPrice: ${formatUnits(override.gasPrice, 'gwei')},
    at ${new Date().toLocaleString('en-US', { timeZone: 'Australia/Perth' })}`
  )
  lastTrade.count = lastTrade.count + 1
  try {
    const tx = await uniArbi.execute(plan.pairs, plan.meta, override)

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

async function findBestArbi(gasPrice: BigNumber) {
  const bestArbi = {
    plan: arbiPlans[0],
    profit: BigNumber.from('0'),
  }

  try {
    const requries = arbiPlans.map(async (plan) => {
      const amount = parseEther(plan.meta[31].toString())
      const amounts = (await uniArbi.getAmountsOut(amount, plan.pairs, plan.meta)) as BigNumber[]
      let output = amounts[amounts.length - 1]
      if (plan.feeApplied) {
        output = output.mul(990).div(1000)
      }
      const gasCost = plan.gas.mul(gasPrice)
      return { profit: output.sub(amount), gasCost, plan }
    })
    const planResults = await Promise.all(requries)
    planResults.forEach((result) => {
      const { profit, plan, gasCost } = result
      const amount = parseEther(plan.meta[31].toString())
      const profitAfterGas = profit.sub(gasCost)

      if (profit.gt(0)) {
        console.log(
          `profit: ${formatEther(profit)} gasCost:${formatEther(gasCost)}, amount: ${formatEther(amount)}, strategy: ${
            plan.name
          } at: ${new Date().toLocaleString('en-US', { timeZone: 'Australia/Perth' })}`
        )
      }

      if (profitAfterGas.gt(bestArbi.profit)) {
        bestArbi.profit = profit
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

      // let gasPrice = await provider.getGasPrice()
      // console.log('gasPrice', gasPrice.toString())
      let gasPrice = await getGas()

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

      const option = {
        gasPrice,
      }

      const arbiPlan = await findBestArbi(gasPrice)
      if (arbiPlan.profit.gt(0)) {
        if (lastTrade.status === TransactionStatus.Pending) {
          console.log(
            `pending transaction ${lastTrade.tx} was sent ${
              (Date.now() - lastTrade.timestamp) / 1000
            } seconds ago. replaced it`
          )
        }
        await executeStrategy(arbiPlan.plan, option)
      }
    } catch (error) {
      console.error(error)
    }
  }
}
async function getGas() {
  const url =
    'https://data-api.defipulse.com/api/v1/egs/api/ethgasAPI.json?api-key=3a9c5ef9fff1a6e00216834bcb6a31a7b896994fa8bf44728284cebc9be9'
  const {
    data: { fast, fastest },
  } = await axios.get(url)
  return parseUnits(BigNumber.from(fast).div(10).toString(), 'gwei')
}
async function approve() {
  await uniArbi.approve(
    [DAI, CORE, WBTC, DAI, CORE, WDAI, WCORE, WBTC, WWBTC, WETH],
    [WDAI, WCORE, WWBTC, ROUTER, ROUTER, ROUTER, ROUTER, ROUTER, ROUTER, ROUTER]
  )

  const weth = new Contract(WETH, erc20Abi, signer)
  await weth.approve(contractAddr, ethers.constants.MaxUint256)
  const chi = new Contract(CHI, chiAbi, signer)
  await chi.approve(contractAddr, ethers.constants.MaxUint256)
}

const functionToRun = runCoreArbi
// const functionToRun = approve
functionToRun()
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
