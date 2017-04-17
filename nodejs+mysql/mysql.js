/**
 * Created by Administrator on 2017/3/30.
 */
var mysql = require("mysql");
var connection = mysql.createConnection({
    host     : "localhost",
    user     : 'root',
    password : '',
    database : 'japan'
})
connection.connect();
module.exports=connection;