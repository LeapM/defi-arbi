import { providers } from 'ethers'

const provider = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')
// async function sellCoreProfit(amount: ethers.BigNumber) {
//   const [, , sellCore] = await router.getAmountsOut(amount, [CORE, WETH, DAI])
//   const [buyWCore] = await router.getAmountsIn(amount, [WDAI, WCORE])
//   const profit = sellCore.gt(buyWCore) ? formatEther(sellCore.sub(buyWCore)) : '-' + formatEther(buyWCore.sub(sellCore))
//   return profit
// }

// async function sellWCoreProfit(amount: ethers.BigNumber) {
//   const [, sellPrice] = await router.getAmountsOut(amount, [WCORE, WDAI])
//   // console.log('dai sell wcore price', formatEther(sellPrice))
//   const [buyPrice] = await router.getAmountsIn(amount, [DAI, WETH, CORE])
//   // console.log('dai buy core price', formatEther(buyPrice))
//   const profit = sellPrice.gt(buyPrice)
//     ? formatEther(sellPrice.sub(buyPrice))
//     : '-' + formatEther(buyPrice.sub(sellPrice))
//   return profit
// }

// async function getBalances() {
//   const [dai, wdai, core, wcore] = await coreArbi.getBalances()
//   console.log(
//     `dai bal: ${formatEther(dai)}, wdai bal: ${formatEther(wdai)}, core bal: ${formatEther(
//       core
//     )}, wcore bal: ${formatEther(wcore)}`
//   )
// }
// async function approve() {
//   await coreArbi.approve()
// }

async function checkTx() {
  // const tx = '0xb83cea44d982449f0e00c0682c615098f98414e3ce6db978067c5951ab05359a'
  const failedTx = '0x3052cb5c56c1e40f480406e055b1879fea7c07eba202c7b57ab70ad1fdf0fe43'
  const failedReceipt = await provider.getTransactionReceipt(failedTx)
  console.log(failedReceipt.status, JSON.stringify(failedReceipt, undefined, 2))
  const successfulTx = '0x9da2050cfd71243ac1b0f5f4ce4aa6ef503695473453446e58a151ca7a269f26'
  const successReceipt = await provider.getTransactionReceipt(successfulTx)
  console.log(successReceipt.status, JSON.stringify(successReceipt, undefined, 2))
}

// const functionToRun = checkTx
checkTx().then(console.log).catch(console.error)
