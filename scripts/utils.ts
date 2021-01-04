import { Contract } from 'ethers'
import { abi as erc20Abi } from '../abis/erc20.json'
export async function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export function getErc20Instance(token: string, provider: any) {
  return new Contract(token, erc20Abi, provider)
}
