const dal = require("../data-access-layer/dal");

function getAllReservationsAsync() {
    return dal.executeQueryAsync(`
    Select reservations.id , reservations.tableId, reservations.participants, reservations.date,reservations.name,reservations.phone,reservations.email,reservations.groupUid, locations.name as locationName, locations.id as location
    from reservations
    join tables on reservations.tableId=tables.id
    join locations on tables.location=locations.id
    ORDER by reservations.date
    `);
};
function getReservationByIdAsync(id) {
    return dal.executeQueryAsync(`
    Select reservations.id , reservations.tableId, reservations.participants, reservations.date,reservations.name,reservations.phone,reservations.email,reservations.groupUid, locations.name as locationName, locations.id as location
    from reservations
    join tables on reservations.tableId=tables.id
    join locations on tables.location=locations.id
    where reservations.id=?
    ORDER by reservations.date
    `,[id]);
};

function getReservationsByTable(tableId) {
    return dal.executeQueryAsync(`
    Select reservations.id , reservations.tableId, reservations.participants, reservations.date,reservations.name,reservations.phone,reservations.email,reservations.groupUid, locations.name as locationName, locations.id as location
    from reservations
    join tables on reservations.tableId=tables.id
    join locations on tables.location=locations.id
    where reservations.tableId =? and date >= CURDATE()
    ORDER by reservations.date
    `, [tableId]);
};

function getAllFutureReservationsAsync() {
    return dal.executeQueryAsync(`
    SELECT * 
    FROM reservations
    WHERE date >= CURDATE();
    `)
}

function UpdateReservationAsync(tableId, participants, date, id, name, phone,email, groupUid) {
    return dal.executeQueryAsync(`
    UPDATE reservations
    SET tableId=?, participants=?, date = ?,name = ?,phone = ?, email=?,groupUid=?
    WHERE reservations.id = ?;
    `, [tableId, participants, date, name, phone,email, groupUid, id])
}
function UpdateReservationAsyncByGroupUid(date, name, phone, email, groupUid) {
    return dal.executeQueryAsync(`
    UPDATE reservations
    SET date = ?,name = ?,phone = ?,email=?
    WHERE reservations.groupUid=?;
    `, [date, name, phone, email, groupUid])

}

function getTableLocationAsync(tableId) {
    return dal.executeQueryAsync(`
        select locations.name 
        from locations
        join tables on tables.location = locations.id
        where tables.id = ?
    `, [tableId])
};

function addReservationAsync(tableId, participants, date, name, phone, email, groupUid = null) {
    return dal.executeQueryAsync(`
    insert into reservations (id,tableId,participants,date,name,phone,email,groupUid) 
    values (null,?,?,?,?,?,?,?)
    `, [tableId, participants, date, name, phone,email, groupUid])
}

function deleteReservationAsync(id, groupUid) {
    if (groupUid) {
        return dal.executeQueryAsync(`
        DELETE FROM reservations WHERE reservations.groupUid = ?   
        `, [groupUid])
    } else {
        return dal.executeQueryAsync(`
        DELETE FROM reservations WHERE reservations.id = ?   
        `, [id])
    }
}


module.exports = {
    getAllReservationsAsync,
    getAllFutureReservationsAsync,
    UpdateReservationAsync,
    getTableLocationAsync,
    addReservationAsync,
    deleteReservationAsync,
    UpdateReservationAsyncByGroupUid,
    getReservationsByTable,
    getReservationByIdAsync,
}