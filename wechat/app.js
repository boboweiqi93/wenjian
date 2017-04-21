module.exports=function app() {
    conosl.log(new Date());
    var ut = require('./common.js');
    var async = require('async');

    var request = require('request');
    var cheerio = require('cheerio');

    var read = require("./read.js");

    var newdata;

    var MongoClient = require('mongodb').MongoClient;
    var DB_CONN_STR = 'mongodb://localhost:27017/weixin';

    var public_num = ['日本物语','日本窗','日本良品','东京新青年','日本设计小站','今日日本','视角日本','日本那些事','这才是是日本','相约东京'];

    var i=0;
    //根据用户名显示欢迎信息
    function hello(_name){
        if(i<public_num.length){
            console.log("----------------------------------------------------------------")
            console.log('开始获取公众号 "'+public_num[i]+'"!!!');
            //任务数组
            var task = [];
            //根据public_num搜索公众号,最好是微信号或者微信全名.
            task.push(function (callback) {
                ut.search_wechat(public_num[i], callback)
            });
            //根据url获取公众号获取最后10条图文列表
            task.push(function (url, callback) {
                ut.look_wechat_by_url(url, callback)
            })
            //根据图文url获取详细信息,发布日期,作者,公众号,阅读量,点赞量等
            task.push(function (article_titles, article_urls, article_pub_times, article_thumb, article_abstract, callback) {
                ut.get_info_by_url(article_titles, article_urls, article_pub_times, article_thumb, article_abstract, callback)
            })
            //执行任务
            async.waterfall(task, function (err, data) {
                if (err) return console.log(err);
                newdata = data;
                var content;
                async.each(data, function (obj, cb) {
                    var selectData = function(db, callback) {
                        //连接到表 site
                        var collection = db.collection('category');
                        //查找数据
                        collection.find({},{"title":1}).toArray(function(err, result) {
                            if(err)
                            {
                                console.log('Error:'+ err);
                                return;
                            }
                            callback(result);
                        });
                    };

                    MongoClient.connect(DB_CONN_STR, function (err, db) {
                        console.log("一条新闻获取完毕")
                        selectData(db, function(result) {
                            console.log(obj.title)
                            var flag=true;
                            for(var i = 0;i<result.length;i++){
                                if(result[i].title==obj.title){
                                    flag=false;
                                }
                            }
                            var insertData = function (db, callback) {
                                //连接到表 category
                                var collection = db.collection('category');
                                //插入数据
                                collection.insert([{
                                    "title": `${obj.title}`,
                                    "abstract": `${obj.abstract}`,
                                    "platform": `${obj.platform}`,
                                    "source": `${obj.source}`,
                                    "thumb": `${obj.thumb}`,
                                    "content": "",
                                    "url": `${obj.url}`,
                                    "tags": `${obj.tags}`,
                                    "time": `${obj.time}`,
                                    "state": 1,
                                    "read_num": `${obj.read_num}`,
                                    "like_num": `${obj.like_num}`
                                }], function (err, result) {
                                    read.readCon(obj.url, function (data) {

                                    })
                                    if (err) {
                                        console.log('Error:' + err);
                                        return;
                                    }
                                    callback();
                                });
                            }
                            if(flag==true){
                                insertData(db, function (result) {
                                    db.close();
                                });
                            }
                            db.close();
                        });

                    });
                }, function (err, data) {
                    cb();

                })
            })
            i++
        }else{
            clearInterval()
        }

    }
    var __sto = setInterval;
    setInterval = function(callback,timeout,param){
        var args = Array.prototype.slice.call(arguments,2);
        var _cb = function(){
            callback.apply(null,args);
        }
        __sto(_cb,timeout);
    }
    setInterval(hello,80000,i);

}