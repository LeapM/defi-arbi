import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import deployer from '../secret/deployer.json'
import COREArbi from '../abis/COREArbi.json'
import { abi as chiAbi } from '../abis/chi.json'
import FeeProvider from '../abis/IFeeApprover.json'
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
  COREDAILP,
} from '../constants/addresses'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { delay } from './utils'
import { ONE_BTC } from '../constants/baseUnits'
import { SOR } from '@balancer-labs/sor'
import BIGNUMBER from 'bignumber.js'
const { parseEther, formatEther } = utils

const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const signer = new Wallet(deployer.key, provider)
const coreArbi = new Contract(COREARBI, COREArbi.abi, signer)
const chi = new Contract(CHI, chiAbi, signer)
const router = new Contract(ROUTER, UniV2Router.abi, signer)
let failureCounter = 0

async function getCOREInDai(amount: BigNumber) {
  const [, dai] = await router.getAmountsOut(amount, [WETH, DAI])
  const [, wcore] = await router.getAmountOut(dai, [WDAI, WCORE])
}

async function getLpPrice(amount: BigNumber) {
  const poolsUrl = 'https://ipfs.fleek.co/ipns/balancer-team-bucket.storage.fleek.co/balancer-exchange/pools'
  const provider = new ethers.providers.InfuraProvider(undefined)
  const gasPrice = await provider.getGasPrice()
  const sor = new SOR(provider, new BIGNUMBER(gasPrice.toString()), 3, 1, poolsUrl)
  await sor.fetchPools()
  const tokeIn = COREDAILP
  await sor.setCostOutputToken(tokeIn)
  const [swaps, amountOut] = await sor.getSwaps(tokeIn, WETH, 'swapExactIn', new BIGNUMBER(amount.toString()))
  const amountOutBn = BigNumber.from(amountOut.toString())
  const price = amountOutBn.mul(parseEther('1')).div(amount)
  console.log(formatEther(price))
}
const functionToRun = getLpPrice
functionToRun(parseEther('500'))
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
