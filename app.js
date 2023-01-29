#!/usr/bin/env node
'use strict';
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const bodyParser = require('body-parser');
const http = require('http')
const util = require('util');
const express = require('express')
const app = express();
const expressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');
const bearerToken = require('express-bearer-token');
const cors = require('cors');
const constants = require('./config/constants.json')
const bcrypt = require("bcryptjs");

const host = process.env.HOST || constants.host;
const port = process.env.PORT || constants.port;

require("./config/database").connect();

const helper = require('./app/helper')
const invoke = require('./app/invoke')
const qscc = require('./app/qscc')
const test = require('./app/test')
const query = require('./app/query')
const User = require("./model/user");
const nft = require("./model/nft");

const auth = require("./middleware/auth");


app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
// set secret variable
app.set('secret', 'thisismysecret');
app.use(expressJWT({
    secret: 'thisismysecret'
}).unless({
    path: ['/users','/users/login', '/register']
}));
app.use(bearerToken());

logger.level = 'debug';

app.use((req, res, next) => {
    logger.debug('New req for %s', req.originalUrl);
    if (req.originalUrl.indexOf('/users') >= 0 || req.originalUrl.indexOf('/users/login') >= 0 || req.originalUrl.indexOf('/register') >= 0 || req.originalUrl.indexOf('/test') >= 0) {
        return next();
    }
    var token = req.token;
    jwt.verify(token, app.get('secret'), (err, decoded) => {
        if (err) {
            console.log(`Error ================:${err}`)
            res.send({
                success: false,
                message: 'Failed to authenticate token. Make sure to include the ' +
                    'token returned from /users call in the authorization header ' +
                    ' as a Bearer token'
            });
            return;
        } else {
            req.username = decoded.username;
            req.orgname = decoded.orgName;
            logger.debug(util.format('Decoded from JWT token: username - %s, password - %s', decoded.username, decoded.orgname));
            return next();
        }
    });
});

async function initilizeNFT(){
	var nftVal = await nft.findOne({});
	if (nftVal == null) {
		nft.create({nftNum:1});
	}
}
initilizeNFT();
var server = http.createServer(app).listen(port, function () { console.log(`Server started on ${port}`) });
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************', host, port);
server.timeout = 240000;

function getErrorMessage(field) {
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    };
    return response;
}

// Register and enroll user
// app.post('/users', async function (req, res) {
//     var username = req.body.username;
//     var orgName = req.body.orgName;
//     logger.debug('End point : /users');
//     logger.debug('User name : ' + username);
//     logger.debug('Org name  : ' + orgName);
//     if (!username) {
//         res.json(getErrorMessage('\'username\''));
//         return;
//     }
//     if (!orgName) {
//         res.json(getErrorMessage('\'orgName\''));
//         return;
//     }
//
//     var token = jwt.sign({
//         exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
//         username: username,
//         orgName: orgName
//     }, app.get('secret'));
//
//     let response = await helper.getRegisteredUser(username, orgName, true);
//
//     logger.debug('-- returned from registering the username %s for organization %s', username, orgName);
//     if (response && typeof response !== 'string') {
//         logger.debug('Successfully registered the username %s for organization %s', username, orgName);
//         response.token = token;
//         res.json(response);
//     } else {
//         logger.debug('Failed to register the username %s for organization %s with::%s', username, orgName, response);
//         res.json({ success: false, message: response });
//     }
//
// });

// Register and enroll user
app.post('/register', async function (req, res) {

    // Get user input
    const { first_name, last_name, username, email } = req.body;

    logger.debug('End point : /register');
    logger.debug('first_name : ' + first_name);
    logger.debug('last_name : ' + last_name);
    logger.debug('username : ' + username);
    logger.debug('email : ' + email);

    if (!username) {
        res.json(getErrorMessage('\'username\''));
        return;
    } else if (!email) {
        res.json(getErrorMessage('\'email\''));
        return;
    }

    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await User.findOne({ username }).exec();
    const oldEmail = await User.findOne({ email }).exec();
    if (oldUser || oldEmail) {
        return res.json(getErrorMessage('\'User already exit\''));
    }

    // Add HyperLedger Fabric Orgnisation

    // new helper.addOrganizationn.then(function (username, user.P0PORT, user.CAPORT) {
    //
    // }));

    // helper.addOrganizationn.then(function(username, scanRndPortsResponse[0], scanRndPortsResponse[1]) {
    //     console.log(value);
    //     // expected output: "Success!"
    //     return promise2;
    // });

    // let addOrganizationResponse = await helper.addOrganization(username, user.P0PORT, user.CAPORT);
    // if(!addOrganizationResponse.success){
    //     return res.json(getErrorMessage('\'Add Organization failed\''));
    // }

    // Add HyperLedger Fabric Orgnisation
    // let deployCCToOrganizationResponse = await helper.deployCCToOrganization(username, addOrganizationResponse.P0PORT);
    // if(!deployCCToOrganizationResponse.success){
    //     return res.json(getErrorMessage('\'Deploy CC To Organization failed\''));
    // }

    // Create token
    // const token = jwt.sign(
    //     { user_id: user._id, email },
    //     constants.TOKEN_KEY,
    //     {
    //         expiresIn: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
    //     }, app.get('secret')
    // );

    let response = await helper.registerAndGetSecret(username, 'org1');
    console.log("reponse:", response);

    // Encrypt user password
    var encryptedPassword = await bcrypt.hash(response.secret, 10);

    // Create user in our database
    const user = await User.create({
        first_name,
            last_name,
        username,
        email: email.toLowerCase(), // sanitize: convert email to lowercase
        password: encryptedPassword
    });

    var token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
        username: username,
        user_id: user._id,
        email: email
    }, app.get('secret'));

    // save user token
    user.token = token;

    console.log('User Token: '+token)
    logger.debug('-- Token: %s', token);

    logger.debug('-- returned from registering the username %s for organization %s', username);
    if (response && typeof response !== 'string') {
        logger.debug('Successfully registered the username %s for organization %s', username);
        response.token = token;
        res.json(response);
    } else {
        logger.debug('Failed to register the username %s for organization %s with::%s', username, response);
        res.json({ success: false, message: response });
    }
});

// Login and get jwt
app.post('/users/login', async function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    logger.debug('End point : /users');
    logger.debug('User name : ' + username);
    if (!username) {
        res.json(getErrorMessage('\'username\''));
        return;
    }
    if (!password) {
        res.json(getErrorMessage('\'password\''));
        return;
    }
    // var encryptedPassword = await bcrypt.hash(password, 10);
    // const oldUser = await User.find({ 'username': username, 'password': encryptedPassword }).exec();
    // if(!oldUser) {
    //     res.json({ success: false, message: `User not found.` });
    //     return;
    // }
    // Validate if user exist in our database
    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(password, user.password))) {
        // Create token
        // const token = jwt.sign(
        //     {user_id: user._id, email},
        //     process.env.TOKEN_KEY,
        //     {
        //         expiresIn: "2h",
        //     }
        // );

        var token = jwt.sign({
            exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
            username: username,
            password: password
        }, app.get('secret'));
        res.json({success: true, message: 'User login successfully', token: token});
        return;
    }
    res.json({ success: false, message: `User with username ${username} is not registered with ${password}, Please register first.` });
    return;
    // let isUserRegistered = await helper.isUserRegistered(username, password);
    //
    // if (isUserRegistered) {
    //     res.json({ success: true, message: { token: token } });
    //
    // } else {
    //     res.json({ success: false, message: `User with username ${username} is not registered with ${password}, Please register first.` });
    // }
});


// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
    try {
        logger.debug('==================== INVOKE ON CHAINCODE ==================');
        var peers = req.body.peers;
        var chaincodeName = req.params.chaincodeName;
        var channelName = req.params.channelName;
        var fcn = req.body.fcn;
        var args = req.body.args;
        var transient = req.body.transient;
        console.log(`Transient data is ;${transient}`)
        logger.debug('channelName  : ' + channelName);
        logger.debug('chaincodeName : ' + chaincodeName);
        logger.debug('fcn  : ' + fcn);
        logger.debug('args  : ' + args);
        if (!chaincodeName) {
            res.json(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            res.json(getErrorMessage('\'channelName\''));
            return;
        }
        if (!fcn) {
            res.json(getErrorMessage('\'fcn\''));
            return;
        }
        if (!args) {
            res.json(getErrorMessage('\'args\''));
            return;
        }
        args[1] = args[0]
        const nftval = await nft.findOne({ });
	console.log("ntfval:" , nftval);
        args[0] = nftval.nftNum
        logger.debug('updated args  : ' + args);

        let message = await invoke.invokeTransaction(channelName, chaincodeName, fcn, args, req.username, 'org1', transient);

        const response_payload = {
            result: message,
            error: null,
            errorData: null
        }

        await nft.findOneAndUpdate({},{nftNum:parseInt(args[0] + 1)})

        res.send(response_payload);

    } catch (error) {
        const response_payload = {
            result: null,
            error: error.name,
            errorData: error.message
        }
        res.send(response_payload)
    }
});

app.get('/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
    try {
        logger.debug('==================== QUERY BY CHAINCODE ==================');

        var channelName = req.params.channelName;
        var chaincodeName = req.params.chaincodeName;
        console.log(`chaincode name is :${chaincodeName}`)
        let args = req.query.args;
        let fcn = req.query.fcn;
        let peer = req.query.peer;

        logger.debug('channelName : ' + channelName);
        logger.debug('chaincodeName : ' + chaincodeName);
        logger.debug('fcn : ' + fcn);
        logger.debug('args : ' + args);

        if (!chaincodeName) {
            res.json(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            res.json(getErrorMessage('\'channelName\''));
            return;
        }
        if (!fcn) {
            res.json(getErrorMessage('\'fcn\''));
            return;
        }
        if (!args) {
            res.json(getErrorMessage('\'args\''));
            return;
        }
        // console.log('args=======d===', args);
        // args = args.replace(/'/g, '"');
        // args = JSON.parse(args);
        // logger.debug(args);
        // console.log('args======a====', args);

        let message = await query.query(channelName, chaincodeName, args, fcn, req.username, "org1");

        const response_payload = {
            result: message,
            error: null,
            errorData: null
        }

        res.send(response_payload);
    } catch (error) {
        const response_payload = {
            result: null,
            error: error.name,
            errorData: error.message
        }
        res.send(response_payload)
    }
});

app.get('/qscc/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
    try {
        logger.debug('==================== QUERY BY CHAINCODE ==================');

        var channelName = req.params.channelName;
        var chaincodeName = req.params.chaincodeName;
        console.log(`chaincode name is :${chaincodeName}`)
        let args = req.query.args;
        let fcn = req.query.fcn;
        // let peer = req.query.peer;

        logger.debug('channelName : ' + channelName);
        logger.debug('chaincodeName : ' + chaincodeName);
        logger.debug('fcn : ' + fcn);
        logger.debug('args : ' + args);

        if (!chaincodeName) {
            res.json(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            res.json(getErrorMessage('\'channelName\''));
            return;
        }
        if (!fcn) {
            res.json(getErrorMessage('\'fcn\''));
            return;
        }
        if (!args) {
            res.json(getErrorMessage('\'args\''));
            return;
        }
        console.log('args==========', args);
        args = args.replace(/'/g, '"');
        args = JSON.parse(args);
        logger.debug(args);

        let response_payload = await qscc.qscc(channelName, chaincodeName, args, fcn, req.username, req.password);

        // const response_payload = {
        //     result: message,
        //     error: null,
        //     errorData: null
        // }

        res.send(response_payload);
    } catch (error) {
        const response_payload = {
            result: null,
            error: error.name,
            errorData: error.message
        }
        res.send(response_payload)
    }
});

