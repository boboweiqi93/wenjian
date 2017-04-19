var ut = require('./common.js');
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');

var read = require("./read.js")

console.log('开始获取!!!')
var public_num = '日本物语';
//任务数组
var task = [];

var newdata;


var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = 'mongodb://localhost:27017/weixin';


//根据public_num搜索公众号,最好是微信号或者微信全名.
task.push(function (callback) {
    ut.search_wechat(public_num, callback)
});
//根据url获取公众号获取最后10条图文列表
task.push(function (url, callback) {
    ut.look_wechat_by_url(url, callback)
})
//根据图文url获取详细信息,发布日期,作者,公众号,阅读量,点赞量等
task.push(function (article_titles, article_urls, article_pub_times, callback) {
    ut.get_info_by_url(article_titles, article_urls, article_pub_times, callback)
})
//执行任务

async.waterfall(task, function (err, data) {
    if (err) return console.log(err);
    newdata = data;
    var content;
    async.each(data,function(obj,cb){
        var insertData = function(db, callback) {
            //连接到表 category
            var collection = db.collection('category');
            //插入数据
            collection.insert([{"title":`${obj.title}`,"abstract":`${obj.abstract}`,"url":`${obj.url}`,"read_num":`${obj.read_num}`,"like_num":`${obj.like_num}`,"release_time":`${obj.release_time}`,"author":`${obj.author}`,"wechat_number":`${obj.wechat_number}`,"content":""}], function(err, result) {

                read.readCon(obj.url, function (data) {

                })

                if(err)
                {
                    console.log('Error:'+ err);
                    return;
                }
                callback();
            });
        }

        MongoClient.connect(DB_CONN_STR, function(err, db) {
            console.log("连接成功！");
            insertData(db, function(result) {
                db.close();
            });
        });


    },function(err,data){
        cb();
    })
})

