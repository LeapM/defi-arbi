import { ethers } from 'hardhat'
import { Transaction } from 'ethers'
import config from '../hardhat.config'
const { provider } = ethers
export async function getTransactionTimeStamp(txHash: string) {
  const block = await provider.getBlock(txHash)
  return block.timestamp
}

export async function getTransactionGas(tx: Transaction) {
  const transactionInfo = await ethers.provider.getTransactionReceipt(tx.hash!)
  return transactionInfo.gasUsed
}
export async function impersonate(address: string) {
  await ethers.provider.send('hardhat_impersonateAccount', [address])
}

export async function stopImpersonate(address: string) {
  await provider.send('hardhat_stopImpersonatingAccount', [address])
}

export async function resetNetwork() {
  await provider.send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl: config.networks?.hardhat?.forking?.url,
        blockNumber: config.networks?.hardhat?.forking?.blockNumber,
      },
    },
  ])
}

export async function advanceTimeAndBlock(time: number) {
  await advanceTime(time)
  await advanceBlock()

  return await provider.getBlock('latest')
}

export async function advanceTime(time: number) {
  await provider.send('evm_increaseTime', [time])
}

export async function advanceBlock() {
  await provider.send('evm_mine', [])
}
