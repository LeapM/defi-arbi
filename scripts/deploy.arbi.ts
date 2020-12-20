import { ethers, network } from 'hardhat'
async function deploy(contract: string, params?: any) {
  // We get the contract to deploy
  const wallet = ethers.Wallet.createRandom().connect(ethers.provider)
  const Factory = await ethers.getContractFactory(contract, wallet)
  console.log((await ethers.getSigners())[0].getAddress())
  console.log('random wallet address', wallet.address, Factory)
  const instance = params ? await Factory.deploy(params) : await Factory.deploy()
  console.log(`contract: ${contract} deployed at ${instance.address} and owned by ${instance.deployTransaction.from}`)
}

deploy('COREArbi')
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
