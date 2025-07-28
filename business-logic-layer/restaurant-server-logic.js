const config = require("../config.json");
const restaurantLogic = require("../business-logic-layer/restaurant-logic");
const tablesLogic = require("../business-logic-layer/tables-logic");

async function validateAsync(id, tableId, participants, date, location, phone, name, email, newRes) {
    const nonRounded = new Date(date)
    const reqDate = new Date(Math.round(nonRounded.getTime() / (1000 * 60 * 5)) * (1000 * 60 * 5));
    const AllReservations = await restaurantLogic.getAllReservationsAsync();
    const tables = await tablesLogic.getAllTablesAsync();
    const errors = [];
    const open = config.openingHours.open;
    const close = config.openingHours.close;
    const openTime = getTimeOnSameDay(reqDate, open);
    const closeTime = getTimeOnSameDay(reqDate, close);
    if (closeTime < openTime) {
        closeTime.setDate(closeTime.getDate() + 1);
    }

    const reservationEndTime = new Date(reqDate.getTime() + 1.5 * 60 * 60 * 1000);

    if (!id && !newRes) errors.push("must send a valid id");
    if (!newRes && !AllReservations.some(r => +r.id === +id)) errors.push("this reservation does not exist");
    if (!newRes && !tableId) errors.push("must send a valid tableId");
    if (!newRes && !tables.some(t => t.id === tableId)) errors.push("table " + tableId + " does not exist");
    if (!participants) errors.push("must send valid participants");
    if (participants < 1 || participants > 12) errors.push("we only accept parties of 1-12 people");
    if (isNaN(reqDate.getTime())) errors.push("must send a valid date");
    if (new Date() > new Date(date) && newRes) errors.push("must send a future Date");
    if (!location) errors.push("must select a valid location");
    if (!phone) errors.push("must select a valid phone");
    if (!name) errors.push("must select a valid name");
    if (!email) errors.push("must select a valid email");
    if (reqDate < openTime) errors.push("the requested time is not within our opening hoers")
    if (reservationEndTime > closeTime) errors.push("the requested time is after our opening hoers")

    return errors;
};

function getTimeOnSameDay(baseDate, timeStr) {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
}

function getPossibleTimes(date) {
    const nonRounded = new Date(date)
    const reqDate = new Date(Math.round(nonRounded.getTime() / (1000 * 60 * 5)) * (1000 * 60 * 5));

    const startSearch = new Date(reqDate.getTime() - (2.5 * 60 * 60 * 1000))
    const endSearch = new Date(reqDate.getTime() + (2.5 * 60 * 60 * 1000))

    const possibleTimes = [];

    for (let t = new Date(startSearch.getTime()); t <= endSearch;
        t = new Date(t.getTime() + (15 * 60 * 1000))) {
        possibleTimes.push(t)
    };
    possibleTimes.sort((a, b) => Math.abs(a.getTime() - reqDate.getTime()) - Math.abs(b.getTime() - reqDate.getTime()));

    return possibleTimes;
};

async function getCapacityTablesAsync(participants) {
    const tables = await tablesLogic.getAllTablesAsync();

    const barTables = tables.filter(t => t.location === 1);
    const capacityTables = tables.filter(t => t.capacity >= participants && t.capacity <= participants + 3);

    return {
        barTables,
        capacityTables
    };
};

async function findSlotsForTablesAsync(possibleTimes, tablesToCheck, location, participants, id) {
    const reservations = await restaurantLogic.getAllFutureReservationsAsync();
    const slots = [];
    outer: for (const time of possibleTimes) {
        const endT = new Date(time.getTime() + (1.5 * 60 * 60 * 1000));
        if (+location === 1 && participants <= 4) {
            const availableTables = tablesToCheck.filter(table => {
                const tableReservations = reservations.filter(r => r.tableId === table.id);
                return !tableReservations.some(r =>
                    !(new Date(r.date).getTime() + 1.5 * 60 * 60 * 1000 <= time.getTime() ||
                        new Date(r.date).getTime() >= endT.getTime())
                );
            });

            const consecutiveGroup = findConsecutiveGroupOnBar(availableTables, participants);

            if (consecutiveGroup) {
                slots.push({
                    tableIds: consecutiveGroup.map(t => t.id),
                    locationName: "bar",
                    location: 1,
                    date: time
                });

                if (slots.length >= 10) break;
            }

        } else {
            for (const table of tablesToCheck) {
                const tableReservations = reservations
                    .filter(r => r.tableId === table.id && r.id !== id)
                    .map(r => ({
                        start: new Date(r.date),
                        end: new Date(new Date(r.date).getTime() + (1.5 * 60 * 60 * 1000))
                    }));

                const hasConflict = tableReservations.some(r => !(r.end <= time || r.start >= endT));

                if (slots.length >= 10) {
                    break outer;
                }
                if (!hasConflict) {
                    const locationName = await restaurantLogic.getTableLocationAsync(table.id);
                    slots.push({
                        tableId: table.id,
                        locationName: locationName[0].name,
                        location: +table.location,
                        date: time
                    });
                    break;
                }
            }
        }
    }
    return slots;
};

function findConsecutiveGroupOnBar(tables, participants) {
    const sorted = tables.filter(t => t.location === 1).sort((a, b) => a.id - b.id);

    for (let i = 0; i <= sorted.length - participants; i++) {
        const group = sorted.slice(i, i + participants);
        const isConsecutive = group.every((table, index) => {
            if (index === 0) return true;
            return table.id === group[index - 1].id + 1;
        });

        if (isConsecutive) return group;
    }

    return null;
};


function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomGroupUid() {
    const letters = "abcdefghijklmnopqrstuv".split("");
    const numbers = "123456789".split("");
    const length = getRandom(4, 7);
    const Uid = [];

    for (let i = 0; i < length; i++) {
        const chance = Math.random();
        if (chance < 0.25) {
            Uid.push(numbers[getRandom(0, numbers.length - 1)]);
        } else if (chance > 0.88) {
            Uid.push(letters[getRandom(0, letters.length - 1)]);
        } else {
            Uid.push(letters[getRandom(0, letters.length - 1)].toUpperCase());
        }
    }

    return Uid.join("");
};


module.exports = {
    validateAsync,
    getPossibleTimes,
    getCapacityTablesAsync,
    findSlotsForTablesAsync,
    getRandomGroupUid
};