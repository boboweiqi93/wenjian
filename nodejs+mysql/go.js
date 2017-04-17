/**
 * Created by mgtcl on 2017/3/31.
 */
var main=require("./main.js");
var CronJob = require('cron').CronJob;
var http = require("http");
var fs = require("fs");
var mysql=require("./mysql.js");
var url = require("url");

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
    mysql.query(`SELECT * FROM catagory order by ctime desc limit ` + begin + "," + num + "", function (error, results, fields) {
    //     mysql.query(`SELECT * FROM catagory order by ctime desc limit 1,2`, function (error, results, fields) {
        var str = JSON.stringify(results);
        console.log(typeof str)
        console.log("正在显示第"+page+"页,共显示"+num+"条数据");
        response.write(str,"utf-8",function(){
            console.log("ok")
        });
        response.end();
    });
}
http.createServer(onRequest).listen(8887);

console.log("Server has started.port on 8887\n");
