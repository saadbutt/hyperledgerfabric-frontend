const { Gateway, Wallets, TxEventHandler, GatewayOptions, DefaultEventHandlerStrategies, TxEventHandlerFactory } = require('fabric-network');
const fs = require('fs');
const path = require("path")
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const util = require('util')
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../javascript/AppUtil.js');
const walletPath = path.join(__dirname, '../wallet');

// const createTransactionEventHandler = require('./MyTransactionEventHandler.ts')

const helper = require('./helper')

// const createTransactionEventHandler = (transactionId, network) => {
//     /* Your implementation here */
//     const mspId = network.getGateway().getIdentity().mspId;
//     const myOrgPeers = network.getChannel().getEndorsers(mspId);
//     return new MyTransactionEventHandler(transactionId, network, myOrgPeers);
// }

const invokeTransaction = async (channelName, chaincodeName, fcn, args, username, org_name, transientData) => {
    try {
        logger.debug(util.format('\n============ invoke transaction on channel %s ============\n', channelName));
        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp = buildCCPOrg1();

        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(Wallets, walletPath);

        // Create a new gateway instance for interacting with the fabric network.
        // In a real application this would be done as the backend server session is setup for
        // a user that has been verified.
        const gateway = new Gateway();

        // setup the gateway instance
        // The user will now be able to create connections to the fabric network and be able to
        // submit transactions and query. All transactions submitted by this gateway will be
        // signed by this user using the credentials stored in the wallet.
        await gateway.connect(ccp, {
            wallet,
            identity: username,
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
        });

        // Build a network instance based on the channel where the smart contract is deployed
        const network = await gateway.getNetwork(channelName);

        // Get the contract from the network.
        const contract = network.getContract(chaincodeName);


        let result


        let response = {
            message: '',
            Record: null
        }

        if (fcn == "CreateAsset" || fcn == "updatePrivateData") {
            console.log(`Transient data is : ${JSON.stringify(transientData.object_type)}`)
            let carData = transientData
            let assetKey = transientData.asset_id
            console.log(`Asset data is : ${JSON.stringify(carData)}`)

            result = await contract.createTransaction(fcn)
                .setTransient({
                    asset_properties: Buffer.from(JSON.stringify(carData))
                })
                .setEndorsingOrganizations(org_name+'MSP')
                .submit(assetKey, `Asset ${assetKey} owned by ${org_name} is not for sale`)
            console.log(`Result : ${JSON.stringify(result)}`)
            response.message = `Successfully submitted transient data`
        } else if (fcn == "MintWithTokenURI") {
            result = await contract.submitTransaction(fcn, args[0], args[1])
            console.log(`Result : ${JSON.stringify(result)}`)
            response.message = `Minting NFT over the blockchain`
            // result
        }
        response.Record = JSON.parse(result)
        return response;


    } catch (error) {

        console.log(`Getting error: ${error}`)
        return error.message

    }
}

exports.invokeTransaction = invokeTransaction;
