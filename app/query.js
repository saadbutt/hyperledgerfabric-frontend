const { Gateway, Wallets, } = require('fabric-network');
const fs = require('fs');
const path = require("path")
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const util = require('util')
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../javascript/AppUtil.js');
const walletPath = path.join(__dirname, '../wallet');

const helper = require('./helper')
const query = async (channelName, chaincodeName, args, fcn, username, org_name) => {

    try {
        console.log(`arguments type is------------------------------------------------------------- ${typeof args}`)
        console.log(`length of args is------------------------------------------------------------ ${args.length}`)
        console.log(`Org ${org_name}`)
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
            let result;

            if (fcn == "ClientAccountID" || fcn == "ReadAsset" || fcn == 'QueryAssetHistory' || fcn == 'GetAssetPrivateProperties' || fcn =='ClientAccountBalance'  ||  fcn == 'OwnerOf' || fcn == 'Name' || fcn == 'Symbol' || fcn == 'TotalSupply') {
                console.log(`arguments type is------------------------------------------------------------- ${typeof args}`)
                console.log(`length of args is------------------------------------------------------------ ${args.length}`)
		console.log(args[0]);
                result = await contract.evaluateTransaction(fcn); //, args[0]);
		console.log(result);
		result = result.toString();
            }
	    else if(fcn == 'ClientMintedNFTs'){
	    	console.log(`arguments type is------------------------------------------------------------- ${typeof args}`)
                console.log(`length of args is------------------------------------------------------------ ${args.length}`)
                console.log(args[0]);
		var clientAccId =  await contract.evaluateTransaction('ClientAccountID');
		console.log("clientAccountId", clientAccId, clientAccId.toString());
//		console.log((await contract.evaluateTransaction('BalanceOf',resoo)).toString());
                result = await contract.evaluateTransaction(fcn, clientAccId);
		console.log(result.toString('hex'));
                console.log(result.toString('base64'));
                console.log(`Transaction has been evaluated, result is: ${result.toString()}`);

		result = JSON.parse(result);
		console.log(result);
	    }
            else if (fcn == "QueryAssetByOwner" || fcn == "QueryAssets"
                || fcn == "collectionCarPrivateDetails" || fcn == "ClientMintedNFTs" 
                || fcn == "ClientAccountID") {
                console.log(`arguments type is------------------------------------------------------------- ${typeof args}`)
                console.log(`length of args is------------------------------------------------------------ ${args.length}`)
                result = await contract.evaluateTransaction(fcn);
                // return result

            }
            else if (fcn == "GetQueryResultForQueryString") {
                console.log(`arguments type is------------------------------------------------------------- ${typeof args}`)
                console.log(`length of args is------------------------------------------------------------ ${args.length}`)
                result = await contract.evaluateTransaction(fcn, '{"selector":{"owner":"ome2s021"}}');
                // return result

            }
	    console.log("result done");
            
           // console.log(`Transaction has been evaluated, result is: ${prettyJSONString(result.toString())}`);
	 
//            result = JSON.parse(result);
            return result


    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        return error.message

    }
}

function prettyJSONString(inputString) {
    return JSON.stringify(JSON.parse(inputString), null, 2);
}

exports.query = query
