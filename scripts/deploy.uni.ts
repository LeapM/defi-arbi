import { ethers } from 'hardhat'

async function main() {
  // We get the contract to deploy
  const Arbi = await ethers.getContractFactory('UniArbi')
  const arbi = await Arbi.deploy()

  console.log('arbi deployed to:', arbi.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
