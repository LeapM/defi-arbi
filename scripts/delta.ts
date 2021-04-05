import { Contract, utils, providers, Wallet, ethers, BigNumber } from 'ethers'
import deltaAbi from '../abis/delta.json'
import { delay } from './utils'

const provider = new providers.InfuraProvider(undefined, 'e78ded4fb530439d9753d7e6688d26e7')
const delta = new Contract('0x9EA3b5b4EC044b70375236A281986106457b20EF', deltaAbi.abi, provider)
let previous = ''
async function getHandler() {
  const address = await delta.tokenTransferHandler()
  console.log(`new: ${address}  old: ${previous}`)
  if (address != previous && previous !== '') {
    console.log('fucking do it')
    console.log(`new: ${address}  old: ${previous}`)
  } else {
    previous = address
  }
}
async function queryStatus() {
  while (true) {
    await delay(600)
    await getHandler()
  }
}
const functionToRun = queryStatus
functionToRun()
  .then((v: any) => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
