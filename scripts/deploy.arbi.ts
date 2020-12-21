import { ethers, upgrades } from 'hardhat'
import { COREARBI } from '../constants/addresses'
async function deployProxy(contract: string) {
  // We get the contract to deploy
  // const wallet = new ethers.Wallet(deployer.key, ethers.provider)
  const Factory = await ethers.getContractFactory(contract)

  const instance = await upgrades.deployProxy(Factory)
  await instance.deployed()
  console.log(`contract: ${contract} deployed at ${instance.address} by address: ${instance.deployTransaction.from}`)
}

async function upgradeProxy(contract: string) {
  // We get the contract to deploy
  // const wallet = new ethers.Wallet(deployer.key, ethers.provider)
  const Factory = await ethers.getContractFactory(contract)
  const instance = await upgrades.upgradeProxy(COREARBI, Factory)
  console.log(`contract: ${contract} deployed at ${instance.address}`)
}

upgradeProxy('COREArbi')
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
