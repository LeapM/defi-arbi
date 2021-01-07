import { expect, util } from 'chai'
import { BigNumber, Contract, Signer } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { getTransactionGas, impersonate, resetNetwork, stopImpersonate } from './utils'
import { ERC20_ABI } from './ABI/ERC20'
import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { abi as erc95Abi } from '../abis/erc95.json'
import { ROUTER, BOT, ME } from '../constants/addresses'
import { ONE_BTC } from '../constants/baseUnits'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
const {
  utils: { formatEther, parseEther },
} = ethers
const approve = async (coreArbi: Contract) => {
  await coreArbi.approve()
}
describe('DEX ARBI Test', () => {
  let dexArbi: Contract
  let uniswapRouter: Contract
  let botSigner: Signer
  beforeEach(async () => {
    await resetNetwork()
    uniswapRouter = new Contract(ROUTER, IUniswapV2Router02.abi, ethers.provider)
    await impersonate(BOT)
    botSigner = ethers.provider.getSigner(BOT)
    const DexArbi = await ethers.getContractFactory('DexArbi', botSigner)
    dexArbi = await DexArbi.deploy()
    await dexArbi.deployed()
    await stopImpersonate(BOT)
  })

  it.only('owner is initialised successfully', async () => {
    expect(await dexArbi.owner()).to.eq(BOT)
  })

  it.only('set the owner reverted', async () => {
    await impersonate(ME)
    await expect(dexArbi.connect(ethers.provider.getSigner(ME)).setOwner(ME)).to.revertedWith('only owner')
    await stopImpersonate(ME)
  })

  it.only('set the owner successful', async () => {
    await impersonate(BOT)
    await dexArbi.connect(botSigner).setOwner(ME)
    expect(await dexArbi.owner()).to.eq(ME)
    await stopImpersonate(BOT)
  })
})
