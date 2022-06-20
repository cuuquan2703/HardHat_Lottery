const {run }= require('hardhat')

const verify = async (contractAddress,args)=>{
    console.log("Verifying.....")
    try {
        await run("verify:verify",{
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (err) {
        if (err.message.toLowerCase().includes("verified")){
            console.log("Already verified")
        }else{
            console.log(err.message)
        }
    }
}

module.exports = {verify}