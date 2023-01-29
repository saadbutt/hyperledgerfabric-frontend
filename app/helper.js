'use strict';

var { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../javascript/CAUtil.js');
const { buildCCPOrg1, buildCCPOrg2, buildWallet } = require('../javascript/AppUtil.js');

const walletPath = path.join(__dirname, '../wallet');

const fs = require('fs');

const util = require('util');

const getCCP = async (org) => {
    let ccpPath = path.resolve(__dirname, '..', '..', 'fabric-samples' , 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, `connection-${org}.json`);
    const ccpJSON = fs.readFileSync(ccpPath, 'utf8')
    const ccp = JSON.parse(ccpJSON);
    return ccp
}

const getCaUrl = async (org, ccp) => {
    return ccp.certificateAuthorities[`ca.${org}.example.com`].url;

}

const getWalletPath = async (org) => {
    return path.join(process.cwd(), 'wallet', `${org}`);
}


const getAffiliation = async (org) => {
    return `${org}.department1`
}

const getRegisteredUser = async (username, userOrg, isJson) => {
    let ccp = await getCCP(userOrg)

    const caURL = await getCaUrl(userOrg, ccp)
    const ca = new FabricCAServices(caURL);

    const walletPath = await getWalletPath(userOrg)
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} already exists in the wallet`);
        var response = {
            success: true,
            message: username + ' enrolled Successfully',
        };
        return response
    }

    // Check to see if we've already enrolled the admin user.
    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('An identity for the admin user "admin" does not exist in the wallet');
        await enrollAdmin(userOrg, ccp);
        adminIdentity = await wallet.get('admin');
        console.log("Admin Enrolled Successfully")
    }

    // build a user object for authenticating with the CA
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');
    let secret;
    try {
        if (username == "superuser") {
            // Register the user, enroll the user, and import the new identity into the wallet.
            secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: username, role: 'client', attrs: [{ name: 'role', value: 'admin', ecert: true }] }, adminUser);
        } else {
            secret = await ca.register({ affiliation: await getAffiliation(userOrg), enrollmentID: username, role: 'client' }, adminUser);
        }
    } catch (error) {
        return error.message
    }

    console.log(`Secrets: ${secret}`)

    let enrollment;
    if (username == "superuser") {
        enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret, attr_reqs: [{ name: 'role', optional: false }] });
    } else {
        enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret });
    }

    let x509Identity;
    x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
        },
        mspId: `${userOrg}MSP`,
        type: 'X.509',
    };

    await wallet.put(username, x509Identity);
    console.log(`Successfully registered and enrolled admin user ${username} and imported it into the wallet`);
    console.log(`Responnse: ${response}`);

    var response = {
        success: true,
        message: username + ' enrolled Successfully',
    };
    return response
}

const isUserRegistered = async (username, userOrg) => {
    const walletPath = await getWalletPath(userOrg)
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const userIdentity = await wallet.get(username);
    if (userIdentity) {
        console.log(`An identity for the user ${username} exists in the wallet`);
        return true
    }
    return false
}

const getCaInfo = async (org, ccp) => {
    return ccp.certificateAuthorities[`ca.${org}.org.example.com`];
}

// const enrollAdmin = async (org, ccp) => {
//
//     console.log('calling enroll Admin method')
//
//     try {
//         const caInfo = await getCaInfo(org, ccp) //ccp.certificateAuthorities['ca.org1.o3.fit'];
//         const caTLSCACerts = caInfo.tlsCACerts.pem;
//         const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
//
//         // Create a new file system based wallet for managing identities.
//         const walletPath = await getWalletPath(org) //path.join(process.cwd(), 'wallet');
//         const wallet = await Wallets.newFileSystemWallet(walletPath);
//         console.log(`Wallet path: ${walletPath}`);
//
//         // Check to see if we've already enrolled the admin user.
//         const identity = await wallet.get('admin');
//         if (identity) {
//             console.log('An identity for the admin user "admin" already exists in the wallet');
//             return;
//         }
//
//         // Enroll the admin user, and import the new identity into the wallet.
//         const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
//         let x509Identity;
//         x509Identity = {
//             credentials: {
//                 certificate: enrollment.certificate,
//                 privateKey: enrollment.key.toBytes(),
//             },
//             mspId: `${org}MSP`,
//             type: 'X.509',
//         };
//
//         await wallet.put('admin', x509Identity);
//         console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
//         return
//     } catch (error) {
//         console.error(`Failed to enroll admin user "admin": ${error}`);
//     }
// }


function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

const  getRndPorts = async (max) => {

    // portscanner.findAPortNotInUse(10000, 16384, '127.0.0.1', function(error, port) {
    //     if(ports[ports.length] !== port) {
    //         console.log('AVAILABLE PORT AT: ' + port);
    //         ports.push(port)
    //         console.log(`Lengthh: ${ports.length}`);
    //         if(ports.length > 2){
    //             breakTheLoop = 0;
    //         }
    //     }
    // })

    var portscanner = require('portscanner')
    var breakTheLoop = false;
    var ports = [];
    while(!breakTheLoop){
        var port = getRndInteger(10000,16000);
        await portscanner.checkPortStatus(port, '127.0.0.1').then(function(status) {
            console.log('AVAILABLE PORT AT: ' + port);
            if(status === 'closed' && port != ports[ports.length-1]) {
                ports.push(port)
                if(ports.length > max-1){
                    breakTheLoop = true;
                }
            }
        })
    }

    return ports;
}

const addOrganization = async (username, P0PORT, CAPORT) => {
    var response = {
        success: true
    };

    // Create Orgnisation & add it to channel
    const shell = require('shelljs');
    shell.cd('../test-network/addNewOrg');
    var child = shell.exec(`./addOrg3.sh up -c mychannel -n ${username} -p0 ${P0PORT} -p1 ${CAPORT} -ca -s couchdb`);
    shell.cd('../../api-2.0');
    if (child.code !== 0) {
        response.success = false;
        console.error(`exec error: ${child.stderr}`);
    }

    var deployCCResponse = await deployCCToOrganization(username, P0PORT);

    var registerUserResponse = await registerAndGetSecret(username, username);

    return response;
}

const deployCCToOrganization = async (username, P0PORT) => {
    var response = {
        success: true
    };

    // Create Orgnisation & add it to channel
    const shell = require('shelljs');
    shell.cd('../test-network');
    var child = shell.exec(`scripts/deployOrgCC.sh mychannel secured ../asset-transfer-secured-agreement/chaincode-go/ go 1.0 1 ${username} ${P0PORT}`);
    shell.cd('../api-2.0');
    if (child.code !== 0) {
        response.success = false;
        console.error(`exec error: ${child.stderr}`);
    }
    return response;
}

const registerAndGetSecret = async (username, userOrg) => {
    // let ccp = await getCCP(userOrg)
    //
    // const caURL = await getCaUrl(userOrg, ccp)
    // const ca = new FabricCAServices(caURL);
    //
    // const walletPath = await getWalletPath(userOrg)
    // const wallet = await Wallets.newFileSystemWallet(walletPath);
    // console.log(`Wallet path: ${walletPath}`);
    //
    // const userIdentity = await wallet.get(username);
    // if (userIdentity) {
    //     console.log(`An identity for the user ${username} already exists in the wallet`);
    //     var response = {
    //         success: true,
    //         message: username + ' enrolled Successfully',
    //     };
    //     return response
    // }
    //
    // // Check to see if we've already enrolled the admin user.
    // let adminIdentity = await wallet.get('admin');
    // if (!adminIdentity) {
    //     console.log('An identity for the admin user "admin" does not exist in the wallet');
    //     await enrollAdmin(userOrg, ccp);
    //     adminIdentity = await wallet.get('admin');
    //     console.log("Admin Enrolled Successfully")
    // }
    //
    // // build a user object for authenticating with the CA
    // const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    // const adminUser = await provider.getUserContext(adminIdentity, 'admin');
    // let secret;
    // try {
    //     // Register the user, enroll the user, and import the new identity into the wallet.
    //     secret = await ca.register({ affiliation: await getAffiliation(userOrg), enrollmentID: username, role: 'client' }, adminUser);
    //     // const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: username, role: 'client', attrs: [{ name: 'role', value: 'approver', ecert: true }] }, adminUser);
    //
    // } catch (error) {
    //     return error.message
    // }

    // build an in memory object with the network configuration (also known as a connection profile)
    const ccp = buildCCPOrg1();

    // build an instance of the fabric ca services client based on
    // the information in the network configuration
    const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

    // setup the wallet to hold the credentials of the application user
    const wallet = await buildWallet(Wallets, walletPath);

    // in a real application this would be done on an administrative flow, and only once
    await enrollAdmin(caClient, wallet, 'Org1MSP');

    // in a real application this would be done only when a new user was required to be added
    // and would be part of an administrative flow
    var response = await registerAndEnrollUser(caClient, wallet, 'Org1MSP', username, 'org1.department1');


    // let enrollment;
    // if (username == "superuser") {
    //     enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret, attr_reqs: [{ name: 'role', optional: false }] });
    // } else {
    //     enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret });
    // }
    //
    // let x509Identity;
    // x509Identity = {
    //     credentials: {
    //         certificate: enrollment.certificate,
    //         privateKey: enrollment.key.toBytes(),
    //     },
    //     mspId: `${userOrg}MSP`,
    //     type: 'X.509',
    // };
    //
    // await wallet.put(username, x509Identity);
    // console.log(`Successfully registered and enrolled admin user ${username} and imported it into the wallet`);
    // console.log(`Responnse: ${response}`);



    return response
}

exports.getRegisteredUser = getRegisteredUser

module.exports = {
    getCCP: getCCP,
    getWalletPath: getWalletPath,
    getRegisteredUser: getRegisteredUser,
    isUserRegistered: isUserRegistered,
    registerAndGetSecret: registerAndGetSecret,
    addOrganization: addOrganization,
    deployCCToOrganization: deployCCToOrganization,
    getRndPorts: getRndPorts

}
