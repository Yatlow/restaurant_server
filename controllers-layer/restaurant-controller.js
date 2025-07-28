const express = require("express");
const restaurantLogic = require("../business-logic-layer/restaurant-logic");
const serverLogic = require("../business-logic-layer/restaurant-server-logic");

const router = express.Router();

router.get("/reservations", async (request, response) => {
    try {
        const result = await restaurantLogic.getAllReservationsAsync();
        response.send(result);
    }
    catch (error) {
        console.log(error);
        response.status(500).send({ message: "Server error" });
    }
});
router.get("/reservations/:id", async (request, response) => {
    try {
        const result = await restaurantLogic.getReservationsByTable(request.params.id);
        response.send(result);
    }
    catch (error) {
        console.log(error);
        response.status(500).send({ message: "Server error" });
    }
});

router.delete("/delete", async (req, res) => {
    if (!req.body.id || isNaN(+req.body.id)) return res.status(400).send({ message: "must send a valid id" });
    try {
        const result = await restaurantLogic.deleteReservationAsync(req.body.id,req.body.groupUid);
        return res.send(result)
    } catch (error) {

    }
})

router.use(async (req, res, next) => {
    const { id, tableId, participants, date, location, phone, name, email, newRes } = req.body;

    const errors = await serverLogic.validateAsync(id, tableId, participants, date, location, phone, name,email, newRes);
    if (errors.length > 0) {
        return res.status(400).send({ message: errors.join(", ") });
    };

    const possibleTimes = serverLogic.getPossibleTimes(date);

    const { barTables, capacityTables } = await serverLogic.getCapacityTablesAsync(participants)
    let tablesInRequestedLocation = capacityTables.filter(t => t.location === +location);
    if (+location === 1 && participants <= 4) tablesInRequestedLocation = barTables;
    const tablesOtherLocations = capacityTables.filter(t => t.location !== +location);

    const slotsInRequestedLocation = await serverLogic.findSlotsForTablesAsync(possibleTimes, tablesInRequestedLocation, location, participants, id);
    const slotsOtherLocations = await serverLogic.findSlotsForTablesAsync(possibleTimes, tablesOtherLocations, +location === 1 ? 0 : location, participants, id);

    const availableSlots = [];


    let otherLocationSlotsToPushCount = slotsOtherLocations.length >= 5 ? 5 : slotsOtherLocations.length;
    if (slotsInRequestedLocation.length < 5) otherLocationSlotsToPushCount = 10 - slotsInRequestedLocation.length;
    availableSlots.push(...slotsInRequestedLocation.slice(0, 10 - otherLocationSlotsToPushCount))
    availableSlots.push(...slotsOtherLocations.slice(0, otherLocationSlotsToPushCount));

    req.body.slots = availableSlots;

    next();
});

router.post("/new_reservation", async (request, response) => {
    const { slots, participants, name, phone, groupUid ,email} = request.body;
    if (slots.length < 1) return response.status(404).send({ message: "no available reservations, try again later.." })
    const { tableIds, tableId, location, locationName, date } = slots[0];
    const nonRounded = new Date(date);
    const reqDate = new Date(Math.round(nonRounded.getTime() / (1000 * 60 * 5)) * (1000 * 60 * 5));
    if (new Date(request.body.date).getTime() !== reqDate.getTime()) {
        const responseData = {
            availableSlots: slots,
        };
        responseData.conflictCode = 1;
        if (String(location) !== String(request.body.location)) {
            if (responseData.conflictCode === 1) {
                responseData.conflictCode = 3;
            } else {
                responseData.conflictCode = 2;
            }
        }
        const messages = {
            1: "Requested time is not available.",
            2: "Requested location is not available.",
            3: "Requested time and location are not available.",
        };
        responseData.message = messages[responseData.conflictCode];

        return response.status(409).send(responseData)
    } else {
        try {
            const addedReservations = [];
            let NewGroupUid = groupUid;

            if (!groupUid && slots[0].tableIds?.length > 1) {
                NewGroupUid = serverLogic.getRandomGroupUid();
            }
            if (tableIds) {
                for (let tId of tableIds) {
                    const result = await restaurantLogic.addReservationAsync(tId, 1, date, name, phone, email, groupUid);
                    addedReservations.push({
                        id: result.insertId,
                        tableId: tId,
                        participants: 1,
                        date,
                        location,
                        locationName,
                        phone,
                        name,
                        groupUid: NewGroupUid
                    });
                }
            } else {
                const result = await restaurantLogic.addReservationAsync(tableId, participants, date, name, phone, email);
                addedReservations.push({
                    id: result.insertId,
                    tableId,
                    participants,
                    date,
                    location,
                    locationName,
                    phone,
                    name,
                    groupUid
                });
            };
            response.send(addedReservations);
        }
        catch (error) {
            console.log(error);
            response.status(500).send({ message: "Server error" });
        }
    }
});

router.post("/update_reservation", async (request, response) => {
    const { id, tableId, participants, date, slots, location, phone, name,email, groupUid } = request.body;

    const nonRounded = new Date(date);
    const reqDate = new Date(Math.round(nonRounded.getTime() / (1000 * 60 * 5)) * (1000 * 60 * 5));
    if (new Date(slots[0].date).getTime() === reqDate.getTime() && String(location) === String(slots[0].location)) {
        try {
            const {locationName}= slots[0];
            const updatedReservations = [];

            let NewGroupUid = groupUid || null;
            if (!groupUid && slots[0].tableIds?.length > 1) {
                NewGroupUid = serverLogic.getRandomGroupUid();
            }
            const tableIds = slots[0].tableIds;
            if (groupUid) await restaurantLogic.UpdateReservationAsyncByGroupUid(date, name, phone, email,groupUid);
            if (tableIds) {
                const result = await restaurantLogic.UpdateReservationAsync(tableIds[0], 1, date, id, name, phone,email,NewGroupUid);
                updatedReservations.push({
                    id: id,
                    tableId: tableIds[0],
                    participants: 1,
                    date,
                    location,
                    locationName,
                    phone,
                    name,
                    email,
                    effected: result.affectedRows,
                    groupUid: NewGroupUid
                });
                for (let i = 1; i < tableIds.length; i++) {
                    const result = await restaurantLogic.addReservationAsync(tableIds[i], 1, date, name, phone,email, NewGroupUid)
                    updatedReservations.push({
                        id: result.insertId,
                        tableId: tableIds[i],
                        participants: 1,
                        date,
                        location,
                        locationName,
                        phone,
                        name,
                        email,
                        effected: result.affectedRows,
                        groupUid: NewGroupUid
                    });
                }
            } else {
                const result = await restaurantLogic.UpdateReservationAsync(tableId, participants, date, id, name, phone,email,null);
                updatedReservations.push({
                    id: id,
                    tableId,
                    participants: 1,
                    date,
                    location,
                    locationName,
                    phone,
                    name,
                    email,
                    effected: result.affectedRows,
                    groupUid
                });

            }
            response.send(updatedReservations);
        }
        catch (error) {
            console.log(error);
            response.status(500).send({ message: "Server error" });
        }
    } else {
        const responseData = {
            availableSlots: slots,
        };
        if (new Date(slots[0].date).getTime() !== reqDate.getTime()) {
            responseData.conflictCode = 1;
        }
        if (String(location) !== String(slots[0].location)) {
            if (responseData.conflictCode === 1) {
                responseData.conflictCode = 3;
            } else {
                responseData.conflictCode = 2;
            }
        }
        const messages = {
            1: "Requested time is not available.",
            2: "Requested location is not available.",
            3: "Requested time and location are not available.",
        };
        responseData.message = messages[responseData.conflictCode];

        return response.status(409).send(responseData)
    }
});



module.exports = router;