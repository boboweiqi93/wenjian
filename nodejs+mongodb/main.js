/**
 * Created by Administrator on 2017/3/30.
 */
module.exports=function main() {
    var read = require("./read.js");
    var write = require("./write.js");
    var async = require("async");
    var request = require("request");
    var fs= require("fs");
    var page="0";
    var con="5";
    var begin=page*con;

    var categaryInfo;
    var arccon;
    async.series([
        // 获取cid ，即文章详情页的地址
        function (cb) {
            var url = "http://api.3g.ifeng.com/clientChannelNewsSearch?k=%E6%97%A5%E6%9C%AC&action=down&pullNum=2&gv=5.5.3&av=0&proid=ifengnews&os=ios_10.2.1&vt=5&screen=1242x2208&publishid=4002&uid=c47defdb20e2453bbed56bfa5173e1f4&nw=wifi";
            write.writeCategary(url, function (data) {
                categaryInfo = data;
                console.log(new Date().toLocaleTimeString())
                console.log("凤凰网第一部分over")
                cb();
            })
        },
        //2. 获取具体内容
        function (cb) {
            async.each(categaryInfo, function (obj, cb1) {
                write.writeArc(obj.cid, function (data) {
                    arccon = data;
                    cb1();
                })
            }, function () {
                cb();
            })
        }
    ], function () {
        console.log("凤凰网第二部分over");
        console.log("");
    });
}

