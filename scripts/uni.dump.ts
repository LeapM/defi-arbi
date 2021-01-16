import fs from 'fs'
import { abi as factoryAbi } from '@uniswap/v2-core/build/UniswapV2Factory.json'
import { abi as pairAbi } from '@uniswap/v2-core/build/UniswapV2Pair.json'
import { abi as erc20Abi } from '../abis/erc20.json'
import { BigNumber, Contract, ethers } from 'ethers'
import { FACTORY } from '../constants/addresses'

const provider = new ethers.providers.InfuraProvider(undefined, 'e78ded4fb530439d9753d7e6688d26e7')

const factoryContract = new Contract(FACTORY, factoryAbi, provider)

async function getAllPairs() {
  const content = fs.readFileSync('pariInfo.json') as any

  const allPairs = JSON.parse(content)
  const pairsCount = (await factoryContract.allPairsLength()) as BigNumber
  console.log('total pair', pairsCount.toNumber())
  for (let i = allPairs.length; i < pairsCount.toNumber(); i++) {
    const pair = (await factoryContract.allPairs(i)) as string
    console.log('proecessing pair', pair, i)
    const pairInfo = await getPairInfo(pair)
    allPairs.push(pairInfo)
    if (i % 20 === 0) {
      fs.writeFileSync('pariInfo.json', JSON.stringify(allPairs, null, 2))
      console.log('same to file up to ', i)
    }
  }
}

async function getPairInfo(pairAddress: string) {
  const pairContract = new Contract(pairAddress, pairAbi, provider)
  const [reserve0, reserve1, blockTimestamp] = await pairContract.getReserves()
  const token0 = await pairContract.token0()
  const token1 = await pairContract.token1()
  return {
    address: pairAddress,
    token0: {
      address: token0,
      ...(await getTokenInfo(token0)),
    },
    token1: {
      address: token1,
      ...(await getTokenInfo(token1)),
    },
    reserve0: reserve0.toString(),
    reserve1: reserve1.toString(),
    blockTimestamp,
  }
}
const tokenCache = {} as any
async function getTokenInfo(tokenAddress: string) {
  if (tokenCache[tokenAddress]) {
    return tokenCache[tokenAddress]
  }

  const pairContract = new Contract(tokenAddress, erc20Abi, provider)
  let symbol = 'N/A'
  try {
    symbol =
      tokenAddress.toUpperCase() === '0X9F8F72AA9304C8B593D555F12EF6589CC3A579A2' ? 'MKR' : await pairContract.symbol()
  } catch {}

  let decimals = 0
  try {
    decimals = await pairContract.decimals()
  } catch {}
  tokenCache[tokenAddress] = { symbol, decimals }
  return tokenCache[tokenAddress]
}

getAllPairs().then(console.log)
