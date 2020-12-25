import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import deployer from '../secret/deployer.json'
import COREArbi from '../abis/COREArbi.json'
import FeeProvider from '../abis/IFeeApprover.json'
import UniV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import { CORE, FACTORY, ROUTER, WETH, DAI, COREARBI, WDAI, WCORE, FOT } from '../constants/addresses'
import { formatUnits } from 'ethers/lib/utils'
import { exit, traceDeprecation } from 'process'
import { delay } from './utils'
const { parseEther, formatEther } = utils

const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const signer = new Wallet(deployer.key, provider)
const coreArbi = new Contract(COREARBI, COREArbi.abi, signer)
const router = new Contract(ROUTER, UniV2Router.abi, signer)
const feeProvider = new Contract(FOT, FeeProvider.abi, signer)
const gasLimit = BigNumber.from('630000')

async function getEthPrice() {
  const [buyPrice] = await router.getAmountsIn(parseEther('1'), [DAI, WETH])
  return buyPrice
}

enum Strategy {
  'WCORE',
  'CORE',
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
  strategy: Strategy,
  amount: BigNumber,
  gasCost: BigNumber,
  fot: BigNumber,
  option: { gasPrice: BigNumber; gasLimit: BigNumber }
) {
  if (lastTrade.count > 5) {
    console.log('execute more than 10 times, need to check if logic is sound')
  }

  const transatcionCountMined = await signer.getTransactionCount()
  const override = { ...option, nonce: transatcionCountMined }
  console.log(
    `executing strategy ${strategy.toString()} at nonce ${override.nonce} gasPrice: ${formatUnits(
      override.gasPrice,
      'gwei'
    )}`
  )
  try {
    const tx =
      strategy == Strategy.CORE
        ? await coreArbi.sellCoreOnEthPair(amount, gasCost, fot, override)
        : await coreArbi.sellCoreOnDaiPair(amount, gasCost, fot, override)

    lastTrade.count = lastTrade.count + 1
    lastTrade.timestamp = Date.now()
    lastTrade.tx = tx.hash
    lastTrade.nonce = tx.nonce
    lastTrade.gasPrice = option.gasPrice
    console.log(`strategy executed with tx ${lastTrade.tx}`)
  } catch (error) {
    console.error('failed to send transaction', error)
  }
}

type ArbiOption = {
  f: (amount: BigNumber, fot: BigNumber) => Promise<BigNumber>
  strategy: Strategy
}

async function findBestArbi(fot: BigNumber) {
  const bestArbi = {
    amount: BigNumber.from('0'),
    strategy: Strategy.CORE,
    profit: BigNumber.from('0'),
  }

  const amounts = ['1', '1.5'].map((a) => parseEther(a))
  const options: ArbiOption[] = [
    { f: coreArbi.getDaiPairArbiRate, strategy: Strategy.WCORE },
    {
      f: coreArbi.getEthPairArbiRate,
      strategy: Strategy.CORE,
    },
  ]
  try {
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

async function isLastTradeCompleted(trade: Trade) {
  if (trade.status === TransactionStatus.Completed) {
    return true
  }
  const receipt = await provider.getTransaction(lastTrade.tx)

  if (!receipt) {
    // in case the tx was replaced by another tx, but lastTrade still have the old tx
    trade.status = TransactionStatus.Completed
    return true
  }

  if (receipt.confirmations > 0) {
    trade.status = TransactionStatus.Completed
    return true
  }
  return false
}

async function runCoreArbi() {
  while (true) {
    try {
      await delay(20000)
      console.log('process at ', new Date().toLocaleString())
      const completed = await isLastTradeCompleted(lastTrade)
      if (!completed) {
        // check how old the transaction is
        const timeSinceSent = Date.now() - lastTrade.timestamp
        const isTimeOut = timeSinceSent > 60 * 1000 * 2
        if (!isTimeOut) {
          continue
        }
      }

      const fot = await feeProvider.feePercentX100()
      let gasPrice = await provider.getGasPrice()

      if (lastTrade.status === TransactionStatus.Pending) {
        if (gasPrice.lt(lastTrade.gasPrice)) {
          gasPrice = lastTrade.gasPrice
        }
      }

      console.log(` gas price: ${formatUnits(gasPrice, 'gwei')} fot: ${formatUnits(fot, 'wei')}`)

      const ethPrice = await getEthPrice()
      const gasCost = gasPrice.mul(gasLimit).mul(ethPrice).div(parseEther('1'))
      const option = {
        gasPrice: gasPrice.mul(102).div(100),
        gasLimit,
      }
      const arbiPlan = await findBestArbi(fot)
      if (arbiPlan.profit.gt(gasCost)) {
        if (lastTrade.status === TransactionStatus.Pending) {
          console.log(
            `pending transaction ${lastTrade.tx} was sent ${
              (Date.now() - lastTrade.timestamp) / 1000
            } seconds ago. replaced it`
          )
        }
        await executeStrategy(arbiPlan.strategy!, arbiPlan.amount, gasCost, fot, option)
      }
    } catch (error) {
      console.error(error)
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
