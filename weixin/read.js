var request=require("request");
var cheerio=require("cheerio");

var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = 'mongodb://localhost:27017/weixin';

module.exports.readCon=function(url,callback){
    request(url,function(err,head,body){
        var $ = cheerio.load(body);
        var content = $("#js_content").html();

        content=unescape(content.replace(/&#x/g,"%u").replace(/;/g,""));
        var updataData = function(db, callback) {
            //连接到表 site
            var collection = db.collection('category');
            //插入数据
            var wherestr = {"url":url};
            var updatastr = {$set:{"content":`${content}`}};
            collection.update(wherestr,updatastr);
        }

        MongoClient.connect(DB_CONN_STR, function(err, db) {
            console.log("连接成功！");
            updataData(db, function(result) {
                db.close();
            });
        });
    })

};
