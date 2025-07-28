const jwt = require("jsonwebtoken");
const axios= require('axios');
const uuid = require("uuid");

const util = require("util");
const verifyAsync = util.promisify(jwt.verify);
const dal = require("../data-access-layer/dal");
const crypto = require("crypto");
const config = require("../config.json");


async function loginAsync(credentials) {
    credentials.password = hash(credentials.password);
    const user = await dal.executeQueryAsync(
        `select * from users 
        where email=?
        and password=?
        `, [credentials.email, credentials.password]
    );
    if (!user || user.length < 1) return null;
    delete user[0].password;

    user[0].token = jwt.sign({ user: user[0] }, config.authSecrets.salt, { expiresIn: config.server.tokenExpiration });
    user[0].refreshToken = jwt.sign({ user: user[0] }, config.authSecrets.refreshSalt, { expiresIn: config.server.refreshExpiration });
    return user[0];
};

async function registerAsync(user) {
    user.password = hash(user.credentials.password);
    user.uuid = uuid.v4();

    const sql = `INSERT INTO users (uuid, firstName, familyName, email, password, role,phone)
    VALUES(?,?,?,?,?,?,?)`;
    const params = [user.uuid, user.firstName, user.familyName, user.credentials.email, user.password, user.role, user.phone]
    await dal.executeQueryAsync(sql, params);
    delete user.credentials;
    delete user.password;
    user.token = jwt.sign({ user: user }, config.authSecrets.salt, { expiresIn: config.server.tokenExpiration });
    user.refreshToken = jwt.sign({ user: user }, config.authSecrets.refreshSalt, { expiresIn: config.server.refreshExpiration });
    return user;
};

async function refreshTokenAsync(refreshToken) {
    try {
        const decoded = await verifyAsync(refreshToken, config.authSecrets.refreshSalt);
        const freshToken = jwt.sign({ user: decoded }, config.authSecrets.salt, { expiresIn: config.server.tokenExpiration });
        return freshToken;
    } catch (error) {
        console.log(error)
        if (error.message === "jwt expired") {
            throw { err: "Your refresh token has expired" }
        } else {
            throw { err: "Unverified token" }
        }
    }
};

async function getAllEmailsAsync() {
    return await dal.executeQueryAsync(`
        select email from users
        `, [])

};

async function getUserAsync(uuid){
    return await dal.executeQueryAsync(`
        SELECT uuid, firstName, familyName, email, role FROM users WHERE uuid = ?
        `,[uuid])
};

async function insertOtpAsync(email, otp) {
    await dal.executeQueryAsync(`
    DELETE FROM otps WHERE email = ?;    
    `,[email]);

    const insertRes = await dal.executeQueryAsync(`
        INSERT INTO otps (email, code, expires_at)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 MINUTE))
    `, [email, otp]);
    const deleteRes = await dal.executeQueryAsync(`
        DELETE FROM otps WHERE expires_at <= NOW()
    `);

    return { insertRes, deleteRes }
};


function generateOTP() {
    const otp = [];
    for (let i = 0; i < 4; i++) {
        otp.push(getRandom(0, 9));
    }
    return otp.join("");
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sendOtpEmailAsync(email, name) {
    try {
        const otp = generateOTP();
        const res = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: 'Reservations no-reply', email: 'yisrael@atlow.co.il' },
            to: [{ email, name }],
            subject: 'your verification code for Reservations',
            htmlContent: `<p>your verification code for Reservations app is: <strong>${otp}</strong></p>`
        }, {
            headers: {
                'api-key': config.brevo.api,
                'Content-Type': 'application/json'
            }
        });
        if (res.data) {
            return { data: res.data, otp }
        } else return { data: "Error sending email" }
    } catch (err) {
        return ({ err: err.response?.data || err.message })
    }
};

function hash(plainText) {
    if (!plainText) return null;
    return crypto.createHmac("sha512", config.authSecrets.hashSalt).update(plainText).digest("hex");

};

module.exports = {
    registerAsync,
    loginAsync,
    getAllEmailsAsync,
    refreshTokenAsync,
    getUserAsync,
    sendOtpEmailAsync,
    insertOtpAsync,
};