import { BigNumber, Contract, providers } from 'ethers'
import UniV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json'
import { CORE, DAI, ROUTER, WBTC, WCORE, WDAI, WETH, WWBTC } from '../constants/addresses'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { delay } from './utils'
const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
const profits: string[] = []
const btcInDai = (btc: BigNumber, price: BigNumber) => {
  return btc.mul(price).div(100000000)
}
const getWBTProfit = async () => {
  const router = new Contract(ROUTER, UniV2Router.abi, provider)
  const amount = parseEther('1')
  const pairs = [
    { sellPath: [CORE, WWBTC], buyPath: [WBTC, WETH, CORE], name: 'WWBTCSELL_WETHBUY' },
    {
      sellPath: [CORE, WETH, WBTC],
      buyPath: [WWBTC, CORE],
      name: 'WETHSELL_WWBTCBUY',
    },
    {
      sellPath: [CORE, WWBTC],
      buyPath: [WDAI, WCORE],
    },
  ]

  while (true) {
    await delay(1000 * 60 * 5)
    try {
      const btcPrice = (await router.getAmountsIn(BigNumber.from('100000000'), [DAI, WETH, WBTC]))[0]
      // console.log(formatEther(btcInDai(BigNumber.from('100000000'), btcPrice)))
      for (let pair of pairs) {
        const sellPrices = (await router.getAmountsOut(amount, pair.sellPath)) as BigNumber[]
        const sellvalue = sellPrices[sellPrices.length - 1].mul(99).div(100)
        const [buyPrice] = await router.getAmountsIn(amount, pair.buyPath)

        if (sellvalue.gt(buyPrice)) {
          const profitInDai = btcInDai(sellvalue.sub(buyPrice), btcPrice)
          if (profitInDai.gt(parseEther('20'))) {
            profits.push(formatEther(profitInDai))
          }
          // console.log('profit is ', sellvalue.sub(buyPrice).mul(btcPrice).div('1e18'))
        }
      }
    } finally {
      if (profits.length > 0) {
        console.log(profits)
      }
    }
  }
}

getWBTProfit().then()
