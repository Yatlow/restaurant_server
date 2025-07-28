const db=require("mysql");

// const pool=db.createPool({
//     host: "localhost",
//     user: "root",
//     database: "restuarant",
//     timezone: "utc"
// });

const pool=db.createPool({
    host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
    port:4000,
    user: "4EshFtTdZVSztCt.root",
    password:"uTDwmc6PTnmbkp1Z",
    database: "restaurant",
    timezone: "utc",
    ssl: {
    rejectUnauthorized: true  
  }
});

function executeQueryAsync(sqlCmd,params=[]) {
    return new Promise((resolve, reject) => {
        pool.query(sqlCmd, params,(err, result)=> {
            if (err) {
                console.log(err);
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
}

module.exports = {
    executeQueryAsync
};