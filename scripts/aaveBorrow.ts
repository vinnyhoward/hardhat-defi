import { getWeth, AMOUNT } from "./getWeth"
import { ethers, getNamedAccounts, network } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { networkConfig } from "../helper-hardhat-config"
import { ILendingPool } from "../typechain-types/ILendingPool"

async function main() {
    const { deployer } = await getNamedAccounts()
    const signer = await ethers.getSigner(deployer)
    await getWeth()
    // abi, address for AAVE
    // Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPool = await getLendingPool(signer)
    // next is to deposit
    const wethTokenAddress = networkConfig[network.config!.chainId!].wethToken!
    // approve
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, signer);
    console.log('Depositing....')
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log('Deposited!')

    // Borrow (margin)
    // how much can we borrow
}

async function getBorrowUserData(lendingPool: ILendingPool, account: string) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } = await lendingPool.getUserAccountData(account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
}

async function getLendingPool(signer: SignerWithAddress) {
    const iLendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config!.chainId!].lendingPoolAddressesProvider!,
        signer
    )
    const lendingPoolAddress = await iLendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, signer)
    return lendingPool
}

async function approveErc20(
    erc20Address: string,
    spenderAddress: string,
    amountToSpend: string,
    signerAccount: SignerWithAddress
) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, signerAccount)

    const txResponse = await erc20Token.approve(spenderAddress, amountToSpend)
    await txResponse.wait(1)
    console.log("approved on behalf of user for lending pool")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
