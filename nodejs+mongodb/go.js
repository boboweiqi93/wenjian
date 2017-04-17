/**
 * Created by mgtcl on 2017/3/31.
 */
var main=require("./main.js");
var CronJob = require('cron').CronJob;
var http = require("http");
var fs = require("fs");
var url = require("url");

var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = 'mongodb://localhost:27017/runoob';

new CronJob('10 * * * * *', function() {
    main();
}, null, true, 'America/Los_Angeles');


function onRequest(request, response){
    if (request.url === '/favicon.ico') {
        response.writeHead(200, {'Content-Type': 'image/x-icon'} );
        response.end();
        return;
    }
    response.writeHead(200, {
        "Content-Type": 'text/plain',
        'charset': 'utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS'
    });//可以解决跨域的请求
    var res_data = url.parse(request.url, true);
    var page = res_data.query.page;
    if(page==undefined){
        page=1;
    }
    var num = res_data.query.count;
    if(num==undefined){
        num=15;
    }
    var begin = page * num;
    // mysql.query(`SELECT * FROM catagory order by ctime desc limit ` + begin + "," + num + "", function (error, results, fields) {
    // //     mysql.query(`SELECT * FROM catagory order by ctime desc limit 1,2`, function (error, results, fields) {
    //     var str = JSON.stringify(results);
    //     console.log(typeof str)
    //     console.log("正在显示第"+page+"页,共显示"+num+"条数据");
    //     response.write(str,"utf-8",function(){
    //         console.log("ok")
    //     });
    //     response.end();
    // });

    var selectData = function(db, callback) {
        //连接到表 site
        var collection = db.collection('arc');
        //插入数据
        // collection.find().limit(`${num}`).skip(`${begin}`).toArray(function(err, result) {
        collection.find().limit(15).skip(1).toArray(function(err, result) {

            if(err)
            {
                console.log('Error:'+ err);
                return;
            }
            var str = JSON.stringify(result);
            console.log(typeof str)
            console.log("正在显示第"+page+"页,共显示"+num+"条数据");
            response.write(str,"utf-8",function(){
                console.log("ok")
            });
            response.end();
        });
    }

    MongoClient.connect(DB_CONN_STR, function(err, db) {
        console.log("连接成功！");
        selectData(db, function(result) {
            console.log(result);
            db.close();
        });
    });

}
http.createServer(onRequest).listen(8886);

console.log("Server has started.port on 8886\n");
