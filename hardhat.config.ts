import { task, HardhatUserConfig } from 'hardhat/config'
import '@openzeppelin/hardhat-upgrades'
import '@nomiclabs/hardhat-waffle'

task('accounts', 'Prints the, list of accounts', async (args, hre) => {
  const accounts = await hre.ethers.getSigners()
  accounts.forEach((account) => console.log(account.address))
})

const blockNumber = 11458352
const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: 'https://eth-mainnet.alchemyapi.io/v2/TsLEJAhX87icgMO7ZVyPcpeEgpFEo96O',
        blockNumber,
      },
    },
  }a
}

export default config
