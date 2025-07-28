const express = require("express");
const tablesLogic = require("../business-logic-layer/tables-logic");

const router = express.Router();

router.get("/", async (request, response) => {
    try {
        const result = await tablesLogic.getAllTablesAsync();
        response.send(result);
    }
    catch (error) {
        console.log(error);
        response.status(500).send({ message: "Server error" });
    }
});

router.get("/name/:id", async (req,res)=>{
    try {
        const id= req.params.id;        
        const result = await tablesLogic.getAllTableNameByIdAsync(id);
        const name=result[0];
        res.send(name);
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server error" });
    }
})


router.use(async (request, response, next) => {
    const { id, capacity, location, x, y, name } = request.body;
    const errors = [];
    const tables = await tablesLogic.getAllTablesAsync();

    if (!id) errors.push("invalid Id");
    if (!tables.some(t => t.id === id)) errors.push("this table does not exist");
    if (!capacity || isNaN(+capacity)) errors.push("invalid Capacity");
    if (!location || isNaN(+location)) errors.push("invalid Location");
    if (x===undefined || isNaN(+x)) errors.push("invalid x");
    if (y===undefined || isNaN(+y)) errors.push("invalid y");
    // if (!name) errors.push("invalid name");

    if (errors.length > 0) {
        console.log(request.body)
        return response.status(400).send({ message: errors.join(", ") });
    }
    next()
});

router.put("/edit_table", async (req, res) => {
    try {
        const result = await tablesLogic.editTableAsync(req.body);
        res.send({ ...req.body, result })
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server error" });
    }
});


module.exports = router;