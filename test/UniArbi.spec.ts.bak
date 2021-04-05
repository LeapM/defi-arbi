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
import { coreWEthPair, coreCBtcPair, wBtcWethPair, DaiWethPair, cDaiCCorePair } from '../constants/uniPairs'
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
    const amount = 10
    const metaForEthBtc = new Array(32).fill(0)
    metaForEthBtc[31] = amount
    metaForEthBtc[0] = 0b1
    metaForEthBtc[1] = 0b100

    const metaForBtcEth = new Array(32).fill(0)
    metaForBtcEth[31] = amount
    // get wbtc, wrap it into cbtc, and reverse the order
    metaForBtcEth[0] = 0b11
    // reverse to get core
    metaForBtcEth[1] = 0b1
    // normal order to get eth
    metaForBtcEth[2] = 0b0

    const metaForDaiEth = new Array(32).fill(0)
    metaForDaiEth[31] = amount
    metaForDaiEth[30] = 0b1
    // reverse to get dai and wrap it into cdai
    metaForDaiEth[0] = 0b111
    // get ccore and unwrap it into core
    metaForDaiEth[1] = 0b1100
    // normal order to get eth
    metaForDaiEth[2] = 0b0

    const metaForEthDai = new Array(32).fill(0)
    metaForEthDai[31] = amount
    // reverse to get CORE and wrap it into cCore
    metaForEthDai[0] = 0b1011
    // reverse to get CDAI and unwrap it into dai
    metaForEthDai[1] = 0b1001
    // normal order to get eth
    metaForEthDai[2] = 0b0
    const options = [
      {
        pairs: [coreWEthPair.address, coreCBtcPair.address, wBtcWethPair.address],
        meta: metaForEthBtc,
        name: 'eth-btc',
      },
      {
        pairs: [wBtcWethPair.address, coreCBtcPair.address, coreWEthPair.address],
        meta: metaForBtcEth,
        name: 'btc-eth',
      },
      {
        pairs: [DaiWethPair.address, cDaiCCorePair.address, coreWEthPair.address],
        meta: metaForDaiEth,
        name: 'dai-eth',
        feeApplied: true,
      },
      {
        pairs: [coreWEthPair.address, cDaiCCorePair.address, DaiWethPair.address],
        meta: metaForEthDai,
        name: 'eth-dai',
      },
    ]

    for (let i = 0; i < options.length; i++) {
      const option = options[i]
      const wethBalanceBefore = await weth.balanceOf(ME)
      const amoutInEth = parseEther(option.meta[31].toString())
      const amounts = await uniArbi.getAmountsOut(amoutInEth, option.pairs, option.meta)
      let output = amounts[amounts.length - 1]
      if (option.feeApplied) {
        output = output.mul(990).div(1000)
      }
      const expectedWEthBalance = wethBalanceBefore.add(output).sub(amoutInEth)
      const tx = await uniArbi.execute(option.pairs, option.meta, {
        gasPrice: parseUnits('100', 'gwei'),
      })
      const gas = await getTransactionGas(tx)
      const wethBalanceAfter = await weth.balanceOf(ME)
      console.log(
        'log',
        formatEther(wethBalanceBefore),
        formatEther(expectedWEthBalance),
        formatEther(wethBalanceAfter),
        formatUnits(gas, 'wei')
      )
      expect(expectedWEthBalance).to.eq(wethBalanceAfter)
      if (wethBalanceAfter.gt(wethBalanceBefore)) {
        console.log('profit', option.name, formatEther(wethBalanceAfter.sub(wethBalanceBefore)))
      } else {
        console.log('lost', option.name, formatEther(wethBalanceBefore.sub(wethBalanceAfter)))
      }
    }

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
