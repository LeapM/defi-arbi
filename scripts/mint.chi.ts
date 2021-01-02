import { ethers, Contract, Wallet, BigNumber } from 'ethers'
import { CHI, ROUTER, WETH } from '../constants/addresses'
import { abi } from '../abis/chi.json'
import wallets from '../secret/wallet.json'
import UniV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import { formatEther, parseUnits } from 'ethers/lib/utils'

const provider = new ethers.providers.InfuraProvider(undefined)
const chi = new Contract(CHI, abi)
const uniRouter = new Contract(ROUTER, UniV2Router.abi)
const signer = new Wallet(wallets.firstMetaMask.key, provider)

const chiArbi = async () => {
  // const tx = await chi.connect(signer).mint(200, { gasPrice: parseUnits('30', 'gwei') })
  const gasCost = BigNumber.from('5125271').mul(parseUnits('30', 'gwei')).mul(100).div(140)
  console.log('cost per 100 chi', formatEther(gasCost))
  const prices = await uniRouter.connect(signer).getAmountsOut(BigNumber.from('100'), [CHI, WETH])
  console.log('uni chi price', formatEther(prices[prices.length - 1]))
}
// 5,125,271 gas x 35 GWEI = 5125271*20*1e9/1e18 = 0.10250542 ETH
// 0.1

chiArbi().then(console.log).catch(console.error)
