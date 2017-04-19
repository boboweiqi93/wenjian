var fs=require("fs");
var http=require("http");
var read=require("./read.js");
var async=require("async");
var path=require("path");

var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = 'mongodb://localhost:27017/runoob';

module.exports.writeArc=function(url,callback){
    //1. 放图片 2. 放内容->cid
    var newdata;
    console.log("writearc begin")
    read.readArc(url,function(data){
        newdata=data;
        if(data.aimg!=="") {
            console.log(data.aimg)
            var imgarr = data.aimg.split(";");
            //console.log(imgarr)
            async.each(imgarr, function (url, cb){
                if( /\.(jpg|png|gif|jpeg)/.test(url)){
                    http.get(url, function (res) {
                        var basename = path.basename(url);
                        //res.pipe(fs.createWriteStream("./public/img/" + basename));
                        cb();
                    })
                }
            }, function () {
                callback(newdata);
            })
        }

    })

};
