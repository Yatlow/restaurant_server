const jwt = require("jsonwebtoken");
const dal = require("../data-access-layer/dal")

async function verifyOtp(request, response, next) {
    const otp = String(request.body.otp);
    const email = String(request.body.email);
    
    if (!otp) return response.status(400).send("no OTP sent");
    try {
        const res = await dal.executeQueryAsync(`
        select * from otps
        where email=?   
        `, [email]);

        const code = res[0]?.code;

        jwt.verify(code, process.env.OTP_SALT, (err, decoded) => {
            
            if (err) {
                console.log(err);
                return response.status(403).send({message:"Invalid or expired OTP"});
            }
            if (decoded.otp !== otp) {
                return response.status(401).send({message:"Incorrect OTP"});
            }
            next();
        });
    } catch (error) {
        response.send(error)
    }
}

module.exports = verifyOtp;