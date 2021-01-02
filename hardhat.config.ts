import { task, HardhatUserConfig } from 'hardhat/config'
import '@openzeppelin/hardhat-upgrades'
import '@nomiclabs/hardhat-waffle'
import deployer from './secret/deployer.json'

task('accounts', 'Prints the, list of accounts', async (args, hre) => {
  const accounts = await hre.ethers.getSigners()
  accounts.forEach((account) => console.log(account.address))
})

const blockNumber = 11563767
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
      // accounts: [`0x${deployer.key}`],
    },
    mainnet: {
      url: 'https://mainnet.infura.io/v3/3ad5fab786964809988a9c7fefc5d3a5',
      accounts: [`0x${deployer.key}`],
    },
    ropsten: {
      url: 'https://ropsten.infura.io/v3/3ad5fab786964809988a9c7fefc5d3a5',
      accounts: [`0x${deployer.key}`],
    },
  },
  mocha: {
    timeout: 40000,
  },
}

export default config
