/**
 * Created by Administrator on 2017/3/30.
 */
var request=require("request");

module.exports.readCategary=function(url,callback){
    request(url,function(err,head,body){


        // var str=[{"listId":"日本","type":"list","expiredTime":180000,"currentPage":1,"totalPage":0,"topsize":0,"item":[
        //
        //     {"thumbnail":"http:\/\/d.ifengimg.com\/w201_h144_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/EDF2906FEB88C3106018A8912539D6B90F852ED7_size18_w386_h247.jpeg","online":"1","title":"石海波添加的文章被人遗忘的第一次淞沪抗战，19路军违命不撤坚决抗日，壮哉！","showType":"0","source":"陈春笔记","subscribe":{"cateid":"陈春笔记","type":"source","catename":"陈春笔记","logo":"","description":""},"updateTime":"2017\/03\/31 14:14:04","id":"http:\/\/api.3g.ifeng.com\/ipadtestdoc?aid=imcp_120455216","documentId":"imcp_120455216","staticId":"imcp_120455216","type":"doc","style":{"backreason":["来源:陈春笔记","标题党","旧闻、重复","内容质量差"],"type":"slides","images":["http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/6BDF25355B558C6D4D968A757247B4F74956F643_size53_w550_h329.jpeg","http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/06697E1592C4121598FADE4C943372AE59E70CE8_size32_w400_h305.jpeg","http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/788170CAA3446269B54571C780D58DFC9DD0421B_size88_w800_h501.jpeg","http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/2843790CDFFFFF37AE97EDC45E4AD844413C2D5B_size21_w386_h247.jpeg","http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/14305F3212EDCCD8650295155EF3611841941071_size86_w600_h434.jpeg"],"slideCount":7,"view":"slideimg"},"hasSlide":true,"commentsUrl":"http:\/\/t.ifeng.com\/appshare\/14307351.shtml","comments":"0","commentsall":"0","link":{"type":"doc","url":"http:\/\/api.3g.ifeng.com\/ipadtestdoc?aid=imcp_120455216","weburl":"http:\/\/share.iclient.ifeng.com\/sharenews.f?aid=120455216"},"reftype":"editor","keywords":""},
        //
        //     {"thumbnail":"http:\/\/d.ifengimg.com\/w201_h144_q100\/p1.ifengimg.com\/cmpp\/2017\/03\/31\/14\/1febeb4c-c4e5-450d-8d9e-efe07849c42b_size69_w500_h325.jpg","online":"1","title":"shihaibo着手重建 日本将解除福岛县大部分地区避难指令","showType":"0","source":"中国新闻网","subscribe":{"cateid":"中国新闻网","type":"source","catename":"中国新闻网","logo":"http:\/\/p3.ifengimg.com\/a\/2016_53\/f022192a527df66.jpg","description":""},"updateTime":"2017\/03\/31 14:17:01","id":"http:\/\/api.3g.ifeng.com\/ipadtestdoc?aid=imcp_120455395","documentId":"imcp_120455395","staticId":"imcp_120455395","type":"doc","style":{"backreason":["来源:中国新闻网","标题党","旧闻、重复","内容质量差"],"view":"titleimg"},"commentsUrl":"http:\/\/t.ifeng.com\/appshare\/14307650.shtml","comments":"0","commentsall":"0","link":{"type":"doc","url":"http:\/\/api.3g.ifeng.com\/ipadtestdoc?aid=imcp_120455395","weburl":"http:\/\/share.iclient.ifeng.com\/sharenews.f?aid=120455395"},"reftype":"editor","keywords":""},
        //
        //     {"thumbnail":"http:\/\/d.ifengimg.com\/w201_h144_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/2175311A7357551DD32A2D5BEE19FDB5AC714060_size120_w535_h342.png","online":"1","title":"wangjiawei2016中国移动支付规模超日本GDP，差距或仅是开始","showType":"0","source":"蚂蚁评测","subscribe":{"cateid":"蚂蚁评测","type":"source","catename":"蚂蚁评测","logo":"","description":""},"updateTime":"2017\/03\/31 14:48:08","id":"http:\/\/api.3g.ifeng.com\/ipadtestdoc?aid=imcp_120456173","documentId":"imcp_120456173","staticId":"imcp_120456173","type":"doc","style":{"backreason":["来源:蚂蚁评测","标题党","旧闻、重复","内容质量差"],"view":"titleimg"},"commentsUrl":"http:\/\/t.ifeng.com\/appshare\/14309478.shtml","comments":"0","commentsall":"0","link":{"type":"doc","url":"http:\/\/api.3g.ifeng.com\/ipadtestdoc?aid=imcp_120456173","weburl":"http:\/\/share.iclient.ifeng.com\/sharenews.f?aid=120456173"},"reftype":"editor","keywords":""},
        //
        //     {"thumbnail":"http:\/\/d.ifengimg.com\/w201_h144_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/4E18023EBB1C169C97630FC75815AC88317F5A32_size52_w1133_h567.jpeg","online":"1","title":"zhaohaobo化妆派该怎么玩？ 日本妹子靠这款粉底惊艳全场","showType":"0","source":"今日日本","subscribe":{"cateid":"今日日本","type":"source","catename":"今日日本","logo":"","description":""},"updateTime":"2017\/03\/31 13:23:59","id":"http:\/\/api.3g.ifeng.com\/ipadtestdoc?aid=imcp_120454920","documentId":"imcp_120454920","staticId":"imcp_120454920","type":"doc","style":{"backreason":["来源:今日日本","标题党","旧闻、重复","内容质量差"],"type":"slides","images":["http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/E60B0A8AB504F489E847FB32BD14A898F5ECC979_size68_w1024_h565.jpeg","http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/6EDB9C8273FCE8C8A422A881D1C6DB22FFEC384E_size162_w1280_h853.jpeg","http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/3337EE67B1DECDBA3C347DE97923EDEC2C39C85D_size32_w481_h532.jpeg","http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/D8F920C9BD7F09F84DB4019BBA3A1E27A259D7C6_size261_w1280_h854.jpeg","http:\/\/d.ifengimg.com\/w164_h113_q100\/p0.ifengimg.com\/pmop\/2017\/0331\/433BD99225A990BEB4DCC1269E0E8CEEC7F6707A_size59_w1280_h853.jpeg"],"slideCount":14,"view":"slideimg"},"hasSlide":true,"commentsUrl":"http:\/\/t.ifeng.com\/appshare\/14306389.shtml","comments":"3","commentsall":"3","link":{"type":"doc","url":"http:\/\/api.3g.ifeng.com\/ipadtestdoc?aid=imcp_120454920","weburl":"http:\/\/share.iclient.ifeng.com\/sharenews.f?aid=120454920"},"reftype":"editor","keywords":""},
        //
        //     {"commentsall":"0"},
        //
        //     {"commentsall":"0"}]}];



        if(!err){
            var arr = body;
            var str=JSON.parse(arr);
            var arr1=[];
            for(i=0;i<str[0].item.length;i++){
                if("title" in str[0].item[i]) {
                    var obj = {};
                    var cid = str[0].item[i].id;
                    var cweburl = str[0].item[i].link.weburl;
                    obj.cid = cid;
                    obj.cweburl = cweburl;
                    arr1.push(obj);
                }
            }
        }else{
            console.log("read err!")
        }
        callback(arr1);
    })
}
module.exports.readArc=function(url,callback){
    request(url,function(err,head,body){
        if(!err){
            var arr=body;
            var str1 = JSON.parse(arr);
            var arr2=[];
            var obj2 = {};
            var objid=str1.body.staticId;
            var title=str1.body.title;
            var source=str1.body.source;
            var thumb=str1.body.thumbnail;
            var content=str1.body.text;
            var url=str1.body.shareurl;
            var cupdateTime=str1.body.updateTime;
            date = new Date(Date.parse(cupdateTime.replace(/\//g, "/")));
            var ctime = date.getTime(cupdateTime)/1000;
            obj2.objid = objid;
            obj2.title = title;
            obj2.abstract = "";
            obj2.platform = "凤凰资讯";
            obj2.source=source;
            obj2.thumb=thumb;
            obj2.content=content;
            obj2.url=url;
            obj2.tags="";
            obj2.ctime=ctime;
            obj2.state="1";
            console.log(obj2);
            arr2.push(obj2);
            callback(arr2)
        }else{
            console.log(err)
        }

    })
}