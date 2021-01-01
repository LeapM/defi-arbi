import { expect, util } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { getTransactionGas, impersonate, resetNetwork, stopImpersonate } from './utils'
import { ERC20_ABI } from './ABI/ERC20'
import { ABI as WCORE_ABI } from './ABI/WCORE'
import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { abi as chiAbi } from '../abis/chi.json'
import { CHI, CORE, COREWHALE, DAI, ME, ROUTER, WBTC, WCORE, WDAI, WETH, ETHWHALE, WWBTC } from '../constants/addresses'
import { ONE_BTC } from '../constants/baseUnits'
const {
  utils: { formatEther, parseEther },
} = ethers
const approve = async (coreArbi: Contract) => {
  await coreArbi.approve(
    [DAI, CORE, WBTC, DAI, CORE, WDAI, WCORE, WBTC, WWBTC],
    [WDAI, WCORE, WWBTC, ROUTER, ROUTER, ROUTER, ROUTER, ROUTER, ROUTER]
  )
}
describe('CORE ARBI Test', () => {
  let coreArbi: Contract
  let core: Contract
  let uniswapRouter: Contract
  let wcore: Contract
  let chi: Contract
  let signers: SignerWithAddress[]
  beforeEach(async () => {
    await resetNetwork()
    signers = await ethers.getSigners()
    core = new Contract(CORE, ERC20_ABI, ethers.provider)
    wcore = new Contract(WCORE, WCORE_ABI, ethers.provider)
    uniswapRouter = new Contract(ROUTER, IUniswapV2Router02.abi, ethers.provider)

    await impersonate(ME)
    const signer = ethers.provider.getSigner(ME)
    const COREArbi = await ethers.getContractFactory('COREArbi', signer)
    coreArbi = await upgrades.deployProxy(COREArbi)
    await coreArbi.deployed()
    await stopImpersonate(ME)

    // chi = new Contract(CHI, chiAbi, signer)
    // await chi.mint(140)
    // await chi.approve(coreArbi.address, 10000000)
    await impersonate(COREWHALE)
    core = core.connect(ethers.provider.getSigner(COREWHALE))
    await core.transfer(coreArbi.address, parseEther('4'))
    await stopImpersonate(COREWHALE)
  })

  it('assign the owner successfully', async () => {
    const owner = await coreArbi.owner()
    expect(owner).to.equal(ME)
  })

  it('approve underlying token', async () => {
    await impersonate(ME)
    const approved = await approve(coreArbi)
    await stopImpersonate(ME)
  })

  it('getArbiProfit works properly', async () => {
    const amount = parseEther('0.5')

    const daiEthProfit = await coreArbi.getArbiProfit([WCORE, WDAI], [DAI, WETH, CORE], amount)
    expect(daiEthProfit).to.eq('12172106965322309438')

    const ethDaiProfit = await coreArbi.getArbiProfit([CORE, WETH, DAI], [WDAI, WCORE], amount)
    expect(ethDaiProfit).to.eq(0)

    const btcEthArbiProfit = await coreArbi.getArbiProfit([CORE, WWBTC], [WBTC, WETH, CORE], amount)
    expect(btcEthArbiProfit).to.eq(0)

    const ethBtcArbiProfit = await coreArbi.getArbiProfit([CORE, WETH, WBTC], [WWBTC, CORE], amount)
    expect(ethBtcArbiProfit).to.eq(0)
  })

  it('getArbiProfit works properly after core eth pump', async () => {
    await whalePump(uniswapRouter)
    const amount = parseEther('0.5')

    const daiEthProfit = await coreArbi.getArbiProfit([WCORE, WDAI], [DAI, WETH, CORE], amount)
    expect(daiEthProfit).to.eq('0')

    const ethDaiProfit = await coreArbi.getArbiProfit([CORE, WETH, DAI], [WDAI, WCORE], amount)
    expect(ethDaiProfit).to.eq('147902563712383152115')

    const btcEthArbiProfit = await coreArbi.getArbiProfit([CORE, WWBTC], [WBTC, WETH, CORE], amount)
    expect(btcEthArbiProfit).to.eq(0)

    const ethBtcArbiProfit = await coreArbi.getArbiProfit([CORE, WETH, WBTC], [WWBTC, CORE], amount)
    expect(ethBtcArbiProfit).to.eq('1513457')
  })

  it('execute sell on eth pair reverted', async () => {
    const amount = parseEther('1')
    const costInDai = parseEther('10')
    await impersonate(ME)
    await approve(coreArbi)
    await expect(coreArbi.executeArbi([CORE, WETH, DAI], [WDAI, WCORE], false, amount, costInDai)).to.be.revertedWith(
      'no profit'
    )
    await stopImpersonate(ME)
  })

  it('execute dai eth arbi successfully', async () => {
    const amount = parseEther('.5')
    const costInDai = parseEther('10')
    await impersonate(ME)
    await approve(coreArbi)
    const sellPath = [WCORE, WDAI]
    const buyPath = [DAI, WETH, CORE]
    const coreBalanceBefore = await getBalance(CORE, coreArbi.address)
    await coreArbi.executeArbi(sellPath, buyPath, true, amount, costInDai)

    const daiAfter = await getBalance(DAI, coreArbi.address)
    expect(daiAfter).to.eq(parseEther('12.315926959853460959'))

    const coreBalanceAfter = await getBalance(CORE, coreArbi.address)
    const wcoreBalanceAfter = await getBalance(WCORE, coreArbi.address)
    expect(coreBalanceAfter).to.eq(wcoreBalanceAfter)
    expect(coreBalanceBefore).to.eq(coreBalanceAfter.add(wcoreBalanceAfter))
    await stopImpersonate(ME)
  })

  it('execute sell on eth dai arbi successfully', async () => {
    await whalePump(uniswapRouter)
    await impersonate(ME)
    await approve(coreArbi)
    const amount = parseEther('0.5')
    const costInDai = parseEther('10')
    const sellPath = [CORE, WETH, DAI]
    const buyPath = [WDAI, WCORE]
    const profit = await coreArbi.getArbiProfit(sellPath, buyPath, amount)
    const coreBalanceBefore = await getBalance(CORE, coreArbi.address)
    await coreArbi.executeArbi(sellPath, buyPath, false, amount, costInDai)
    const daiAfter = await getBalance(WDAI, coreArbi.address)
    console.log('dai balance', formatEther(daiAfter))
    const coreBalanceAfter = await getBalance(CORE, coreArbi.address)
    const wcoreBalanceAfter = await getBalance(WCORE, coreArbi.address)
    expect(coreBalanceAfter).to.eq(coreBalanceBefore.sub(amount))
    expect(coreBalanceBefore).to.eq(coreBalanceAfter.add(wcoreBalanceAfter))
    await stopImpersonate(ME)
  })

  it('execute eth btc arbi successfully', async () => {
    await whalePump(uniswapRouter)
    await impersonate(ME)
    await approve(coreArbi)
    const amount = parseEther('0.5')
    const costInBTC = ONE_BTC.div(1000)
    const sellPath = [CORE, WETH, WBTC]
    const buyPath = [WWBTC, CORE]
    const profit = await coreArbi.getArbiProfit(sellPath, buyPath, amount)
    console.log('profit', profit.toString())
    const coreBalanceBefore = await getBalance(CORE, coreArbi.address)
    await coreArbi.executeArbi(sellPath, buyPath, false, amount, costInBTC)
    const coreBalanceAfter = await getBalance(CORE, coreArbi.address)
    const wcoreBalanceAfter = await getBalance(WCORE, coreArbi.address)
    const wbtcBalanceAfter = await getBalance(WBTC, coreArbi.address)
    const wwbtcBalanceAfter = await getBalance(WWBTC, coreArbi.address)
    expect(coreBalanceAfter).to.eq(coreBalanceBefore)
    expect(wcoreBalanceAfter).to.eq(0)
    expect(wbtcBalanceAfter).to.eq(0)
    expect(wwbtcBalanceAfter).to.eq('1513584')
    await stopImpersonate(ME)
  })

  it.only('execute btc eth arbi successfully', async () => {
    const amount = parseEther('0.5')
    const cost = ONE_BTC.div(10000)
    const sellPath = [CORE, WWBTC]
    const buyPath = [WBTC, WETH, CORE]

    await whaleDump(uniswapRouter)
    await impersonate(ME)
    await approve(coreArbi)
    const profit = await coreArbi.getArbiProfit(sellPath, buyPath, amount)
    const coreBalanceBefore = await getBalance(CORE, coreArbi.address)
    await coreArbi.executeArbi(sellPath, buyPath, true, amount, cost)
    const coreBalanceAfter = await getBalance(CORE, coreArbi.address)
    const wcoreBalanceAfter = await getBalance(WCORE, coreArbi.address)
    const wbtcBalanceAfter = await getBalance(WBTC, coreArbi.address)
    const wwbtcBalanceAfter = await getBalance(WWBTC, coreArbi.address)
    expect(coreBalanceAfter).to.eq(coreBalanceBefore)
    expect(wcoreBalanceAfter).to.eq(0)
    expect(wbtcBalanceAfter).to.eq('45633')
    expect(wwbtcBalanceAfter).to.eq('0')
    await stopImpersonate(ME)
  })
  it('only owner can withdraw asset'),
    async () => {
      await coreArbi.withdrawTokens([CORE], [parseEther('1')], ME)
    }
  it.only('can withdraw asset successfully', async () => {
    await impersonate(ME)
    const balanceBefore = await getBalance(CORE, ME)
    await coreArbi.withdrawTokens([CORE], [parseEther('1')], ME)
    const balanceAfter = await getBalance(CORE, ME)
    console.log(formatEther(balanceBefore), formatEther(balanceAfter))
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
    await stopImpersonate(ME)
  })
})
async function whalePump(uniswapRouter: Contract, amount: BigNumber = parseEther('500')) {
  await impersonate(ETHWHALE)
  const signer = ethers.provider.getSigner(ETHWHALE)
  await uniswapRouter
    .connect(signer)
    .swapETHForExactTokens(amount, [WETH, CORE], ETHWHALE, Math.round(Date.now() / 100), {
      value: parseEther('5000'),
    })

  await stopImpersonate(ETHWHALE)
}

async function whaleDump(uniswapRouter: Contract) {
  await impersonate(COREWHALE)
  const signer = ethers.provider.getSigner(COREWHALE)
  const balance = await getBalance(CORE, COREWHALE)
  console.log('balance', formatEther(balance))
  const core = getErc20Instance(CORE).connect(signer)
  await core.approve(uniswapRouter.address, parseEther('10000'))
  await uniswapRouter
    .connect(signer)
    .swapExactTokensForTokensSupportingFeeOnTransferTokens(
      parseEther('60'),
      0,
      [CORE, WETH],
      COREWHALE,
      Math.round(Date.now() / 100)
    )

  await stopImpersonate(COREWHALE)
}
async function getBalance(token: string, holder: string) {
  const erc20 = getErc20Instance(token)
  return (await erc20.balanceOf(holder)) as BigNumber
}
function getErc20Instance(token: string) {
  return new Contract(token, ERC20_ABI, ethers.provider)
}
