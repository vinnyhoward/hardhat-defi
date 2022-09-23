// @ts-ignore
import { ethers, getNamedAccounts, network } from "hardhat"
import { networkConfig } from "../helper-hardhat-config"

export const AMOUNT = ethers.utils.parseEther("0.1").toString()

export async function getWeth() {
    // call the "deposit" function on the weth contract
    // grab the abi, contract address
    // address: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

    const { deployer } = await getNamedAccounts()
    const signer = await ethers.getSigner(deployer)
    const iWeth = await ethers.getContractAt(
        "IWeth",
        networkConfig[network.config!.chainId!].wethToken!,
        signer,
    )
    const txResponse = await iWeth.deposit({
        value: AMOUNT,
    })
    await txResponse.wait(1)
    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Got ${wethBalance.toString()} WETH`)
}