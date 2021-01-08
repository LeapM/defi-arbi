import { ethers, providers } from 'ethers'
import { UnicodeNormalizationForm } from 'ethers/lib/utils'

const alchemy = new providers.AlchemyProvider(undefined, 'P6b7PduZEpsHlatVROjGcVGQF7CqS_S0')

const infura = new providers.InfuraProvider(undefined, '3ad5fab786964809988a9c7fefc5d3a5')

const infurayQuery = alchemy.getBlockNumber().then((v) => console.log(`infura at ${Date.now()} blocknumber ${v}`))
const alchemyQuery = alchemy.getBlockNumber().then((v) => console.log(`alchemy at ${Date.now()} blocknumber ${v}`))
Promise.all([alchemyQuery, infurayQuery]).then(console.log)
