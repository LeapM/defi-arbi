import { ethers, network, upgrades } from 'hardhat'
import deployer from '../secret/deployer.json'
const ME = '0xB1d2339375Fd56Aa47ed31948D6d779a1A803f56'
const LIVE_ADDRESS = '0x6cd0d546944bb03e2dee89939b208d7884b663c1'
async function deployProxy(contract: string) {
  // We get the contract to deploy
  // const wallet = new ethers.Wallet(deployer.key, ethers.provider)
  const Factory = await ethers.getContractFactory(contract)

  const instance = await upgrades.deployProxy(Factory)
  await instance.deployed()
  console.log(`contract: ${contract} deployed at ${instance.address} by address: ${instance.deployTransaction.from}`)
}

deployProxy('COREArbi')
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
