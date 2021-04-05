import { SOR } from '@balancer-labs/sor'
import { Contract, ethers, Wallet, BigNumber } from 'ethers'
import { WETH, COREDAILP, BALANCER_PROXY, ETH, COREETHLP } from '../constants/addresses'
import wallets from '../secret/wallet.json'
import SUSHI_API from '../abis/sushi_rewards.json'
import { delay } from './utils'
import { formatEther, formatUnits } from 'ethers/lib/utils'
import fs from 'fs'
const {
  utils: { parseUnits, parseEther },
} = ethers

const ME = '0xB13160a16C36E29Eb4718493E34eaBED94b09f22'
const poolsinfo = [] as any
// const provider = new ethers.providers.InfuraProvider(undefined)
const provider = new ethers.providers.AlchemyProvider(undefined, 'P6b7PduZEpsHlatVROjGcVGQF7CqS_S0')

const main = async () => {
  const sushiRewards = new Contract('0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd', SUSHI_API, provider)
  const count = (await sushiRewards.poolLength()) as BigNumber
  console.log('pool length', count.toString())

  for (let i = 0; i < count.toNumber(); i++) {
    const pendingSushi = (await sushiRewards.pendingSushi(i, ME)) as BigNumber
    if (pendingSushi.gt(0)) {
      console.log('pending sushi', formatEther(pendingSushi), i)
    }
  }

  // fs.writeFileSync('sushipoolinfo.json', JSON.stringify(poolsinfo, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
