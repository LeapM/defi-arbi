import { expect, util } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { getTransactionGas, impersonate, resetNetwork, stopImpersonate } from './utils'
import { abi as chiAbi } from '../abis/chi.json'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { CHI, CORE, DAI, ME, ROUTER, WBTC, WCORE, WDAI, WETH, ETHWHALE, WWBTC } from '../constants/addresses'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
const {
  utils: { formatEther, parseEther },
} = ethers

describe('CHI Test', () => {
  let chi: Contract
  beforeEach(async () => {
    await resetNetwork()
    chi = new Contract(CHI, chiAbi)
  })
  it('mint chi successfully', async () => {
    await impersonate(ME)
    const signer = ethers.provider.getSigner(ME)
    const transaction = await chi.connect(signer).mint(160, { gasPrice: parseUnits('20', 'gwei') })
    console.log((await chi.connect(signer).balanceOf(ME)).toString())
    await stopImpersonate(ME)
    const transactionInfo = await ethers.provider.getTransactionReceipt(transaction.hash)
    console.log(formatUnits(transactionInfo.cumulativeGasUsed, 'wei'), formatUnits(transactionInfo.gasUsed, 'wei'))
  })
})
