import { SOR } from '@balancer-labs/sor'
import { Contract, ethers, Wallet } from 'ethers'
import BigNumber from 'bignumber.js'
import { WETH, COREDAILP, BALANCER_PROXY, ETH, COREETHLP } from '../constants/addresses'
import wallets from '../secret/wallet.json'
import { ABI as BALANCER_API } from '../abis/balancer_proxy'
import { delay } from './utils'
import { formatUnits } from 'ethers/lib/utils'
const {
  utils: { parseUnits, parseEther },
} = ethers

const poolsUrl = 'https://ipfs.fleek.co/ipns/balancer-team-bucket.storage.fleek.co/balancer-exchange/pools'
const provider = new ethers.providers.InfuraProvider(undefined)
// const provider = new ethers.providers.AlchemyProvider(undefined, 'P6b7PduZEpsHlatVROjGcVGQF7CqS_S0')

async function execute(
  swaps: any,
  tokenOut: string,
  amountIn: BigNumber,
  amountOut: BigNumber,
  gasPrice: ethers.BigNumber
) {
  console.log('executing...')
  const wallet = new Wallet(wallets.staker.key, provider)
  let proxyContract = new Contract(BALANCER_PROXY, BALANCER_API, provider)
  proxyContract = proxyContract.connect(wallet)
  let tx = await proxyContract.multihopBatchSwapExactIn(
    swaps,
    ETH,
    tokenOut,
    amountIn.toString(),
    amountOut.multipliedBy(100).dividedToIntegerBy(101).toString(),
    {
      value: amountIn.toString(),
      gasPrice,
    }
  )
  console.log(`Tx Hash: ${tx.hash}`)
  await tx.wait()
}

const main = async () => {
  let count = 0
  console.log('starting bal monitor')
  const options = [
    // {
    //   key: 'COREDAI',
    //   tokenOut: COREDAILP,
    //   amountIn: new BigNumber(parseEther('2').toString()),
    //   amoutOutRequired: new BigNumber(parseEther('32').toString()), //0.071
    //   bestRate: new BigNumber(0),
    // },
    {
      key: 'COREETH',
      tokenOut: COREETHLP,
      amountIn: new BigNumber(parseEther('5').toString()),
      amoutOutRequired: new BigNumber(parseEther('6').toString()), //1.05
      bestRate: new BigNumber(0),
    },
  ]
  let counter = 0
  while (count < 2) {
    counter++
    try {
      await delay(1000 * 5)
      const gasPrice = await provider.getGasPrice()
      const sor = new SOR(provider, new BigNumber(gasPrice.toString()), 3, 1, poolsUrl)
      await sor.fetchPools()

      for (const option of options) {
        const { tokenOut, amountIn, amoutOutRequired } = option
        await sor.setCostOutputToken(tokenOut)
        const [swaps, amountOut] = await sor.getSwaps(WETH, tokenOut, 'swapExactIn', amountIn)
        if (amountOut.gt(option.bestRate)) {
          option.bestRate = amountOut
        }

        console.log(
          `${
            option.key
          } Total Return: ${amountOut.toString()}, best rate:${option.bestRate.toString()}, gasprice: ${formatUnits(
            gasPrice,
            'gwei'
          )}`
        )

        if (gasPrice.gt(parseUnits('500', 'gwei'))) {
          console.log('gas is too expensive')
          continue
        }

        if (amountOut.lt(amoutOutRequired)) {
          continue
        }

        count += 1
        await execute(swaps, tokenOut, amountIn, amountOut, gasPrice.mul(102).div(100))
      }
    } catch (error) {}
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('something going wrong')
    process.exit(1)
  })
