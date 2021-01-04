import { BigNumber, Contract, providers } from 'ethers'
import UniV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import { CORE, DAI, ROUTER, WBTC, WCORE, WDAI, WETH, WWBTC } from '../constants/addresses'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import { delay } from './utils'
import { ONE_BTC } from '../constants/baseUnits'
const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const profits: string[] = []
const btcInDai = (btc: BigNumber, price: BigNumber) => {
  return btc.mul(price).div(100000000)
}
const getWBTProfit = async () => {
  const router = new Contract(ROUTER, UniV2Router.abi, provider)
  const amount = parseEther('1')
  const pairs = [
    { sellPath: [CORE, WWBTC], buyPath: [WBTC, WETH, CORE], name: 'btc-eth' },
    {
      sellPath: [CORE, WETH, WBTC],
      buyPath: [WWBTC, CORE],
      name: 'eth-btc',
    },
    {
      sellPath: [CORE, WETH, DAI],
      buyPath: [WDAI, WCORE],
      name: 'eth-dai',
    },
    {
      sellPath: [WCORE, WDAI],
      buyPath: [DAI, WETH, CORE],
      name: 'eth-dai',
    },
  ]

  while (true) {
    try {
      const btcPrice = (await router.getAmountsIn(ONE_BTC, [DAI, WETH, WBTC]))[0]
      // console.log(formatEther(btcInDai(BigNumber.from('100000000'), btcPrice)))
      for (let pair of pairs) {
        const sellPrices = (await router.getAmountsOut(amount, pair.sellPath)) as BigNumber[]
        const sellvalue = sellPrices[sellPrices.length - 1].mul(99).div(100)
        const [buyPrice] = await router.getAmountsIn(amount, pair.buyPath)

        console.log(pair.name, formatUnits(sellvalue.mul('10'), 'gwei'), formatUnits(buyPrice, 'ether'))
      }
      await delay(1000 * 60 * 5)
    } finally {
      if (profits.length > 0) {
        console.log(profits)
      }
    }
  }
}

getWBTProfit().then()
