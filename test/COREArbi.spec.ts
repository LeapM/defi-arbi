import { expect, util } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { getTransactionGas, impersonate, resetNetwork, stopImpersonate } from './utils'
import { ERC20_ABI } from './ABI/ERC20'
import { ABI as WCORE_ABI } from './ABI/WCORE'
import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
const {
  utils: { formatEther, parseEther },
} = ethers

const WHALE = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
const ME = '0xB1d2339375Fd56Aa47ed31948D6d779a1A803f56'
const CORE = '0x62359Ed7505Efc61FF1D56fEF82158CcaffA23D7'
const ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const WDAI = '0x00a66189143279b6DB9b77294688F47959F37642'
const WCORE = '0x17B8c1A92B66b1CF3092C5d223Cb3a129023b669'

describe('CORE ARBI Test', () => {
  let coreArbi: Contract
  let core: Contract
  let uniswapRouter: Contract
  let wcore: Contract
  let signers: SignerWithAddress[]
  beforeEach(async () => {
    await resetNetwork()

    await impersonate(ME)
    const signer = ethers.provider.getSigner(ME)
    const COREArbi = await ethers.getContractFactory('COREArbi', signer)
    coreArbi = await upgrades.deployProxy(COREArbi)
    await coreArbi.deployed()
    core = new Contract(CORE, ERC20_ABI, ethers.provider)
    wcore = new Contract(WCORE, WCORE_ABI, ethers.provider)
    signers = await ethers.getSigners()

    await core.connect(signer).transfer(coreArbi.address, parseEther('4'))
    await stopImpersonate(ME)

    uniswapRouter = new Contract(ROUTER, IUniswapV2Router02.abi, ethers.provider)
  })

  it('assign the owner successfully', async () => {
    const owner = await coreArbi.owner()
    expect(owner).to.equal(ME)
  })

  it('can get CORE/ETH pool information', async () => {
    const info = await coreArbi.getPairInfo(
      '0x62359ed7505efc61ff1d56fef82158ccaffa23d7',
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    )
    console.log('reserve amount', formatEther(info[0]), formatEther(info[1]))
  })
  //   it('get profit', async () => {
  //     const ethPairReturn = await coreArbi.getEthPairArbiRate(parseEther('0.5'))
  //     console.log(formatEther(ethPairReturn))
  //     const daiPairReturn = await coreArbi.getDaiPairArbiRate(parseEther('1'))
  //     console.log(formatEther(daiPairReturn))
  //   })

  //   it('Approve Dai and Core successfully', async () => {
  //     await coreArbi.approve()
  //   })

  it('execute sell on eth pair reverted', async () => {
    await impersonate(ME)
    await coreArbi.approve()
    await expect(coreArbi.sellCoreOnEthPair(parseEther('1'), parseEther('10'))).to.be.revertedWith('no profit')
    await stopImpersonate(ME)
  })

  it('approve underlying token', async () => {
    await impersonate(ME)
    const approved = await coreArbi.approve()
    await stopImpersonate(ME)
    // console.log(parseEther(approved[0]), parseEther(approved[1]))
  })

  it('execute sell on dai pair', async () => {
    await impersonate(ME)
    await coreArbi.approve()

    const transaction = await coreArbi.sellCoreOnDaiPair(parseEther('0.5'), parseEther('10'))
    await stopImpersonate(ME)
    // const transactionInfo = await ethers.provider.getTransactionReceipt(transaction.hash)
    // //gas 573523.0
    // const gasPrice = ethers.utils.parseUnits('40', 'gwei')
    // const ethPrice = 500
    // const gasInDollar = transactionInfo.gasUsed.mul(gasPrice).mul(ethPrice).mul(100).div(parseEther('1'))
    // console.log(ethers.utils.formatUnits(transactionInfo.gasUsed, 'wei'), gasInDollar.toNumber())
  })

  it('execute sell on eth pair successfully', async () => {
    await impersonate(WHALE)
    const signer = ethers.provider.getSigner(WHALE)
    await uniswapRouter
      .connect(signer)
      .swapETHForExactTokens(parseEther('500'), [WETH, CORE], WHALE, Math.round(Date.now() / 100), {
        value: parseEther('5000'),
      })

    await stopImpersonate(WHALE)

    await impersonate(ME)
    await coreArbi.approve()
    const transaction = await coreArbi.sellCoreOnEthPair(parseEther('1'), parseEther('10'))
    console.log('gas ussage:', ethers.utils.formatUnits(await getTransactionGas(transaction.hash), 'wei'))
    const balances = await coreArbi.getBalances()
    balances.forEach((b: BigNumber) => console.log(formatEther(b)))
    await stopImpersonate(ME)
  })

  it('can withdraw asset successfully', async () => {
    await impersonate(ME)
    await coreArbi.approve()
    await coreArbi.sellCoreOnDaiPair(parseEther('0.5'), parseEther('10'))
    const balances = await coreArbi.getBalances()
    const signer = await ethers.provider.getSigner(ME)
    await coreArbi.connect(signer).getTokenBack(WDAI, parseEther('100'))
    const wdai = new Contract(WDAI, ERC20_ABI, ethers.provider)
    const bal = await wdai.balanceOf(ME)
    expect(bal).to.equal(balances[1])
    await stopImpersonate(ME)
  })

  it('wrap core without fot successuflly', async () => {
    const amount = parseEther('0.5')
    await impersonate(ME)
    const signer = ethers.provider.getSigner(ME)
    await core.connect(signer).approve(WCORE, amount)
    await wcore.connect(signer).wrap(ME, amount)
    const wamount = await wcore.balanceOf(ME)
    expect(amount).to.equal(wamount)
    // same amount core is unsrapped
    await expect(() => wcore.connect(signer).unwrap(amount)).to.changeTokenBalance(core, signer, amount)
    // // wrap it again, and transfer this time
    // await core.connect(signer).approve(WCORE, amount)
    // await wcore.connect(signer).wrap(ME, amount)
    // await expect(() => wcore.connect(signer).transfer(signers[0].address, amount)).to.changeTokenBalance(
    //   wcore,
    //   signers[0],
    //   amount
    // )
    await stopImpersonate(ME)
  })
})
