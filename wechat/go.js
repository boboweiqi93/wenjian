/**
 * Created by mgtcl on 2017/4/20.
 */
var main=require("./app.js");
var CronJob = require('cron').CronJob;
var http = require("http");
var fs = require("fs");
var url = require("url");

var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = 'mongodb://localhost:27017/weixin';

new CronJob('30 1 1,9,17 * * *', function() {
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
    var page = Number(res_data.query.page);
    if(page==undefined){
        page=1;
    }
    var num = Number( res_data.query.count );
    if(num==undefined){
        num=15;
    }
    var begin = (page-1) * num;
    var selectData = function(db, callback) {
        //连接到表 site
        var collection = db.collection('category');
        //查询数据
        collection.find({},{limit: num, skip:begin}).sort({"time":-1}).toArray(function(err, result) {
            if(err){
                console.log('Error:'+ err);
                return;
            }
            var str = JSON.stringify(result);
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
http.createServer(onRequest).listen(8885);

console.log("Server has started.port on 8885\n");