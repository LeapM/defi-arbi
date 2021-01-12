import { expect, util } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { getTransactionGas, impersonate, resetNetwork, stopImpersonate } from './utils'
import { ERC20_ABI } from './ABI/ERC20'
import { ABI as WCORE_ABI } from './ABI/WCORE'
import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { abi as chiAbi } from '../abis/chi.json'
import { abi as erc95Abi } from '../abis/erc95.json'
import { coreWEthPair, coreCBtcPair, wBtcWethPair } from '../constants/uniPairs'
import {
  CHI,
  CORE,
  COREWHALE,
  DAI,
  ROUTER,
  WBTC,
  WCORE,
  WDAI,
  WETH,
  WWBTC,
  ETHWHALE,
  WETHWHALE as ME,
} from '../constants/addresses'
import { ONE_BTC } from '../constants/baseUnits'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { sign } from 'crypto'
const {
  utils: { formatEther, parseEther },
} = ethers
const approve = async (coreArbi: Contract) => {
  await coreArbi.approve(
    [DAI, CORE, WBTC, DAI, CORE, WDAI, WCORE, WBTC, WWBTC, WETH],
    [WDAI, WCORE, WWBTC, ROUTER, ROUTER, ROUTER, ROUTER, ROUTER, ROUTER, ROUTER]
  )
}
describe('CORE ARBI Test', () => {
  let uniArbi: Contract
  let core: Contract
  let uniswapRouter: Contract
  let wcore: Contract
  let signers: SignerWithAddress[]
  beforeEach(async () => {
    await resetNetwork()
    signers = await ethers.getSigners()
    core = new Contract(CORE, ERC20_ABI, ethers.provider)
    wcore = new Contract(WCORE, WCORE_ABI, ethers.provider)
    uniswapRouter = new Contract(ROUTER, IUniswapV2Router02.abi, ethers.provider)

    await impersonate(ME)
    const signer = ethers.provider.getSigner(ME)
    const UniArbi = await ethers.getContractFactory('UniArbi', signer)
    uniArbi = await UniArbi.deploy()
    await uniArbi.deployed()
    const chi = new Contract(CHI, chiAbi, ethers.provider.getSigner(ME))
    await chi.mint(140)
    await chi.approve(uniArbi.address, ethers.constants.MaxUint256)
    await stopImpersonate(ME)
  })

  it('getAmountsOut works properly', async () => {
    // await whalePump(uniswapRouter)
    await impersonate(ME)
    const weth = getErc20Instance(WETH).connect(ethers.provider.getSigner(ME))
    await weth.approve(uniArbi.address, ethers.constants.MaxUint256)
    await approve(uniArbi)
    const zeroBytes32 = new Array(32).fill(0)
    //
    zeroBytes32[31] = 4
    zeroBytes32[0] = 1
    zeroBytes32[1] = 0b1100
    const amountOut = await uniArbi.getAmountsOut(
      parseEther('4'),
      [coreWEthPair.address, coreCBtcPair.address],
      zeroBytes32
    )
    amountOut.forEach((amount: BigNumber) => console.log(formatEther(amount)))
    await stopImpersonate(ME)
  })

  it.only('execute successfully', async () => {
    // await whalePump(uniswapRouter)
    await impersonate(ME)
    const weth = getErc20Instance(WETH).connect(ethers.provider.getSigner(ME))
    await weth.approve(uniArbi.address, ethers.constants.MaxUint256)
    await approve(uniArbi)
    const wethBalanceBefore = await weth.balanceOf(ME)
    console.log('balance before', formatEther(wethBalanceBefore))
    const zeroBytes32 = new Array(32).fill(0)
    zeroBytes32[31] = 255
    zeroBytes32[0] = 1
    zeroBytes32[1] = 0b100
    const tx = await uniArbi.execute([coreWEthPair.address, coreCBtcPair.address, wBtcWethPair.address], zeroBytes32, {
      gasPrice: parseUnits('130', 'gwei'),
    })
    const gas = await getTransactionGas(tx)
    const wethBalanceAfter = await weth.balanceOf(ME)
    console.log('balanceafter', formatEther(wethBalanceAfter), formatUnits(gas))
    await stopImpersonate(ME)
  })
})

async function getBalance(token: string, holder: string) {
  const erc20 = getErc20Instance(token)
  return (await erc20.balanceOf(holder)) as BigNumber
}
function getErc20Instance(token: string) {
  return new Contract(token, ERC20_ABI, ethers.provider)
}
