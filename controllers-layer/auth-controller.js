const express = require("express");
const jwt = require("jsonwebtoken");
const config = require("../config.json");

const authLogic = require("../business-logic-layer/auth-logic");
const verifyOtp =require("../middleware/verify-otp");
const Credentials = require("../model/Credentials");

const router = express.Router();

router.post("/login", async (request, response) => {
    try {
        const credentials = new Credentials(request.body);
        const errors = credentials.validate();
        if (errors) return response.status(400).send(errors);

        const loggedInUser = await authLogic.loginAsync(credentials);
        if (!loggedInUser) return response.status(401).send({message:"Incorrect username or password."});
        response.send(loggedInUser);
    }
    catch (err) {
        response.status(500).send(err.message);
    }
});

router.post("/verifyOtp",verifyOtp,(req,res)=>{    
    res.send({message:"verified"})
});

router.get("/otp/:email/:name", async (req, res) => {
    try {
        const email = req.params.email;
        const name = req.params.name;
        if (name !== "login" && name!== "delete") {
            const results = await authLogic.getAllEmailsAsync();
            for (const result of results) {
                if (result.email === email) {
                    return res.status(400).send({ message: "this email is already used" });
                }
            }
        }
        const { data, otp, err } = await authLogic.sendOtpEmailAsync(email, name);
        if (err) return res.status(400).send(err);
        const tokenOtp = jwt.sign({ otp }, config.authSecrets.otpSalt, { expiresIn: config.server.otpExpiration });
        const result = await authLogic.insertOtpAsync(email, tokenOtp)
        res.send({ result, data })
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server error" })
    }
});

router.post("/register",verifyOtp, async (request, response) => {
    try {
        if (!request.body.firstName || !request.body.familyName) {
            return response.status(400).send({message:"cannot register without a valid name!"})
        }
        const credentials = new Credentials(request.body);
        const errors = credentials.validate();
        if (errors) return response.status(400).send(errors);
        
        const newUser = {
            credentials,
            firstName: request.body.firstName,
            familyName: request.body.familyName,
            role: request.body.role || "user",
            phone: request.body.phone
        }
        
        const registeredAndLoggedInUser = await authLogic.registerAsync(newUser);
        response.status(201).send(registeredAndLoggedInUser);
    }
    catch (err) {
        response.status(500).send(err.message);
    }
});

router.post("/refresh", async (request, response) => {
    try {
        const { refreshToken } = request.body;
        if (!refreshToken) return response.status(400).send("Missing refresh token");

        const decoded = jwt.verify(refreshToken, config.authSecrets.refreshSalt);
        
        const [user] = await authLogic.getUserAsync(decoded.user.uuid);
        if (!user) return response.status(401).send("User not found");

        const accessPayload = { user };
        const token = jwt.sign(accessPayload, config.authSecrets.salt,
            { expiresIn: config.server.tokenExpiration });
        const newRefresh = jwt.sign({ user: { uuid: user.uuid } },
            config.authSecrets.refreshSalt,
            { expiresIn: config.server.refreshExpiration });
        return response.send({ token, refreshToken: newRefresh });
    }
    catch (error) {
        if (error.name === "TokenExpiredError")
            return response.status(403).send("Refresh token expired");
        return response.status(500).send(error.message);
    }
});

module.exports = router;