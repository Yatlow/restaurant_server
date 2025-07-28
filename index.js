const express = require("express");
const cors = require("cors");

const restaurantController = require("./controllers-layer/restaurant-controller");
const tablesController = require("./controllers-layer/tables-controller");
const authController = require("./controllers-layer/auth-controller");
const emailController = require("./controllers-layer/email-controller");

const server = express();
server.use(cors());
server.use(express.json());

server.use("/restaurant", restaurantController);
server.use("/tables", tablesController);
server.use("/auth", authController);
server.use("/email", emailController);
server.get("/ping",(req,res)=>{
    res.send("ping pong show:)")
})

server.use("*", (req, res) => {
    res.status(404).send(`Route not found ${req.originalUrl}`);
});

server.listen(4500, () => {
    console.log("Listening on 4500");
}).on("error", (err) => {
    console.log(err);
    if (err.code === "EADDRINUSE")
        console.log("Error: Address in use");
    else
        console.log("Error: Unknown error");
});