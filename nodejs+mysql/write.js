/**
 * Created by Administrator on 2017/3/30.
 */
var fs=require("fs");
var http=require("http");
var mysql=require("./mysql.js");
var read=require("./read.js");
var async=require("async");
var path=require("path");

module.exports.writeCategary=function(url,callback){
    var newdata;
    read.readCategary(url,function(data){
        newdata=data;
        async.each(data,function(obj,cb){
            mysql.query(`replace into arc (cid,cweburl) values ('${obj.cid}','${obj.cweburl}')`,function(){
                cb();
            })
        },function(err,data){
            callback(newdata);
        })
    })
}
module.exports.writeArc=function(url,callback){
    read.readArc(url,function(data){
        newdata=data;
        async.each(data,function(obj,cb){
            mysql.query(`replace into catagory (objid,title,abstract,platform,source,thumb,content,url,tags,ctime,state) values ('${obj.objid}','${obj.title}','${obj.abstract}','${obj.platform}','${obj.source}','${obj.thumb}','${obj.content}','${obj.url}','${obj.tags}','${obj.ctime}','${obj.state}')`,function(){

                cb();
            })
            console.log("OK");
        },function(err,data){
            callback(newdata);
        })
    })
}