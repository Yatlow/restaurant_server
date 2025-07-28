const dal = require("../data-access-layer/dal");

function getAllTablesAsync() {
    return dal.executeQueryAsync(`
    SELECT * from tables
    `);
};

function getAllTableNameByIdAsync(id) {
    return dal.executeQueryAsync(`
    Select name from tables where id=?
    `,[id]);
}

function editTableAsync(table) {
    const { id, capacity, location, x, y, name, rotation } = table;
    const rotVal = rotation ? 1 : 0;
    return dal.executeQueryAsync(`
    UPDATE tables
    SET capacity=?, location = ?, x=?, y=?,name=?, rotation=?
    WHERE tables.id = ?;
    `, [capacity, location, x, y, name, rotVal, id]);
}

module.exports = {
    getAllTablesAsync,
    getAllTableNameByIdAsync,
    editTableAsync
}