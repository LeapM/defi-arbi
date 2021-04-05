import { BigNumber, Contract } from 'ethers'
import { ethers } from 'hardhat'
import { impersonate, resetNetwork, stopImpersonate } from './utils'
import { ERC20_ABI } from './ABI/ERC20'
import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { CORE, ROUTER, WETH, ETHWHALE } from '../constants/addresses'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
const {
  utils: { formatEther, parseEther },
} = ethers
describe('Uniswap Test', () => {
  let uniswapRouter: Contract
  beforeEach(async () => {
    await resetNetwork()
    uniswapRouter = new Contract(ROUTER, IUniswapV2Router02.abi, ethers.provider)
  })

  it('getAmountsOut works properly', async () => {
    const ethAmount = '298'
    const gasInGwei = '2000'
    const gasLimit = '600000'
    const deltaAddress = CORE
    const sender = ETHWHALE

    const maxGasPrice = parseEther('2').div(gasLimit)
    console.log('max gas price', formatUnits(maxGasPrice, 'gwei'))
    const signer = ethers.provider.getSigner(sender)

    const transatcionCountMined = await signer.getTransactionCount()
    const override = {
      value: parseEther(ethAmount),
      gasPrice: parseUnits(gasInGwei, 'gwei'),
      gasLimit: parseUnits(gasLimit, 'wei'),
      nonce: transatcionCountMined,
    }

    await impersonate(sender)
    let ethBalance = await ethers.provider.getBalance(sender)
    console.log('eth balance at starts', formatEther(ethBalance))
    let balance = await getBalance(deltaAddress, sender)
    console.log('core balance', formatEther(balance))

    const minAmount = parseUnits('10', 'wei')
    await uniswapRouter
      .connect(signer)
      .swapExactETHForTokens(minAmount, [WETH, deltaAddress], sender, Math.round(Date.now() / 100 + 120), override)

    balance = await getBalance(deltaAddress, sender)
    console.log('balance after first', formatEther(balance))

    // await uniswapRouter
    //   .connect(signer)
    //   .swapExactETHForTokensSupportingFeeOnTransferTokens(
    //     minAmount,
    //     [WETH, deltaAddress],
    //     sender,
    //     Math.round(Date.now() / 100 + 120),
    //     override
    //   )
    // balance = await getBalance(deltaAddress, sender)
    // console.log('balance after second', formatEther(balance))
    ethBalance = await ethers.provider.getBalance(sender)
    console.log('eth balance at starts', formatEther(ethBalance))

    await stopImpersonate(sender)
    // await whalePump(uniswapRouter)
  })
})

async function getBalance(token: string, holder: string) {
  const erc20 = getErc20Instance(token)
  return (await erc20.balanceOf(holder)) as BigNumber
}
function getErc20Instance(token: string) {
  return new Contract(token, ERC20_ABI, ethers.provider)
}
