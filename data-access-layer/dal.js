const db=require("mysql");


const pool=db.createPool({
    host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
    port:4000,
    user: "4EshFtTdZVSztCt.root",
    password:process.env.DB_PASSWORD,
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