import { SOR } from '@balancer-labs/sor'
import { Contract, ethers, Wallet } from 'ethers'
import BigNumber from 'bignumber.js'
import { WETH, COREDAILP, BALANCER_PROXY, ETH } from '../constants/addresses'
import wallets from '../secret/wallet.json'
import { ABI as BALANCER_API } from '../abis/balancer_proxy'
import { delay } from './utils'
const {
  utils: { parseUnits, parseEther },
} = ethers

const poolsUrl = 'https://ipfs.fleek.co/ipns/balancer-team-bucket.storage.fleek.co/balancer-exchange/pools'
const provider = new ethers.providers.InfuraProvider(undefined)
const main = async (tokenOut: string) => {
  let count = 0
  let bestRate = new BigNumber(0)
  while (count < 5) {
    await delay(1000 * 60)
    const gasPrice = (await provider.getGasPrice()).toString()
    console.log('gasPrice', gasPrice)
    const sor = new SOR(provider, new BigNumber(gasPrice), 3, 1, poolsUrl)
    await sor.fetchPools()
    await sor.setCostOutputToken(tokenOut)
    const amountIn = new BigNumber(parseEther('1').toString())
    const [swaps, amountOut] = await sor.getSwaps(WETH, tokenOut, 'swapExactIn', amountIn)
    if (amountOut.gt(bestRate)) {
      bestRate = amountOut
    }
    console.log(`Total Return: ${amountOut.toString()}, best rate:${bestRate.toString()}`)
    if (amountOut.lt(new BigNumber(parseEther('12').toString()))) {
      continue
    }

    const wallet = new Wallet(wallets.staker.key, provider)
    let proxyContract = new Contract(BALANCER_PROXY, BALANCER_API, provider)
    proxyContract = proxyContract.connect(wallet)
    let tx = await proxyContract.multihopBatchSwapExactIn(
      swaps,
      ETH, // Note TokenIn is ETH address and not WETH as we are sending ETH
      tokenOut,
      amountIn.toString(),
      amountOut.multipliedBy(100).dividedToIntegerBy(101).toString(), // This is the minimum amount out you will accept.
      {
        value: amountIn.toString(), // Here we send ETH in place of WETH
        gasPrice,
      }
    )
    console.log(`Tx Hash: ${tx.hash}`)
    await tx.wait()
    count += 1
  }
}

main(COREDAILP)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
