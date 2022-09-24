// packages
import { getWeth, AMOUNT } from "./getWeth"
import { ethers, getNamedAccounts, network } from "hardhat"
import { BigNumber } from "ethers"

// configs
import { networkConfig } from "../helper-hardhat-config"

// types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ILendingPool } from "../typechain-types/ILendingPool"
import { Address } from "hardhat-deploy/dist/types"

const daiTokenAddress = networkConfig[network.config!.chainId!].daiToken!
const wethTokenAddress = networkConfig[network.config!.chainId!].wethToken!

async function main() {
    const { deployer } = await getNamedAccounts()
    const signer = await ethers.getSigner(deployer)
    await getWeth()
    // abi, address for AAVE
    // Lending Pool Address Provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPool = await getLendingPool(signer)
    // next is to deposit weth
    // approve
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, signer)
    console.log("Depositing....")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited!")

    // Borrow (margin)
    // how much can we borrow
    let { totalDebtETH, availableBorrowsETH } = await getBorrowUserData(lendingPool, deployer)
    const currentDaiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.div(currentDaiPrice)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)

    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei.toString(), deployer)
    await getBorrowUserData(lendingPool, deployer)
    await repay(amountDaiToBorrow.toString(), daiTokenAddress, lendingPool, signer, deployer)
    await getBorrowUserData(lendingPool, deployer);
    // TODO: BONUS: Pay off debt that I have left
}

async function repay(
    amount: string,
    daiAddress: string,
    lendingPool: ILendingPool,
    signer: SignerWithAddress,
    account: string
) {
    await approveErc20(daiAddress, lendingPool.address, amount, signer);
    const repayTxResponse = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTxResponse.wait(1)
    console.log("Repaid!")
}

async function borrowDai(
    daiAddress: string,
    lendingPool: ILendingPool,
    amountDaiToBorrow: string,
    account: Address
) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed some DAI pal!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config!.chainId!].daiEthPriceFeed!
    )

    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}

async function getBorrowUserData(lendingPool: ILendingPool, account: string) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)

    console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH`)

    return { totalDebtETH, availableBorrowsETH }
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
