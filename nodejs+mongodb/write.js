/**
 * Created by Administrator on 2017/3/30.
 */
var fs=require("fs");
var http=require("http");
var read=require("./read.js");
var async=require("async");
var path=require("path");

var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = 'mongodb://localhost:27017/runoob';

module.exports.writeCategary=function(url,callback){
    var newdata;
    read.readCategary(url,function(data){
        newdata=data;
        async.each(data,function(obj,cb){


            // mysql.query(`replace into arc (cid,cweburl) values ('${obj.cid}','${obj.cweburl}')`,function(){
            //     cb();
            // })

            var insertData = function(db, callback) {
                //连接到表 site
                var collection = db.collection('url');
                //插入数据
                // var data = [{"name":"菜鸟教程","url":"www.runoob.com"},{"name":"菜鸟工具","url":"c.runoob.com"}];
                collection.insert([{"cid":`${obj.cid}`,"cweburl":`${obj.cweburl}`}], function(err, result) {
                    if(err)
                    {
                        console.log('Error:'+ err);
                        return;
                    }
                    cb();
                });
            }

            MongoClient.connect(DB_CONN_STR, function(err, db) {
                console.log("连接成功！");
                insertData(db, function(result) {
                    console.log(result);
                    db.close();
                });
            });


        },function(err,data){
            callback(newdata);
        })
    })
}
module.exports.writeArc=function(url,callback){
    read.readArc(url,function(data){
        newdata=data;
        async.each(data,function(obj,cb){


            // mysql.query(`replace into catagory (objid,title,abstract,platform,source,thumb,content,url,tags,ctime,state) values ('${obj.objid}','${obj.title}','${obj.abstract}','${obj.platform}','${obj.source}','${obj.thumb}','${obj.content}','${obj.url}','${obj.tags}','${obj.ctime}','${obj.state}')`,function(){
            //
            //     cb();
            // })
            var insertData = function(db, callback) {
                //连接到表 site
                var collection = db.collection('arc');
                //插入数据
                // var data = [{"name":"菜鸟教程","url":"www.runoob.com"},{"name":"菜鸟工具","url":"c.runoob.com"}];
                collection.insert([{"objid":`${obj.objid}`,"title":`${obj.title}`,"abstract":`${obj.abstract}`,"platform":`${obj.platform}`,"source":`${obj.source}`,"thumb":`${obj.thumb}`,"content":`${obj.content}`,"url":`${obj.url}`,"tags":`${obj.tags}`,"ctime":`${obj.ctime}`,"state":`${obj.state}`}], function(err, result) {
                    if(err)
                    {
                        console.log('Error:'+ err);
                        return;
                    }
                    cb();
                });
            }

            MongoClient.connect(DB_CONN_STR, function(err, db) {
                console.log("连接成功！");
                insertData(db, function(result) {
                    console.log(result);
                    db.close();
                });
            });

            console.log("OK");
        },function(err,data){
            callback(newdata);
        })
    })
}

