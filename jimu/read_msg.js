/**
 * Auto.js Pro 9 (Node.js)
 * 清理消息（每处理完一个会话，就点一次底部“消息”Tab 以校正页面）
 */

/************* 基本配置 *************/
var APP_PKG = "com.fenzotech.jimu";
var RUN_MINUTES = 60;
var __START_TS = Date.now();
var __DEADLINE = __START_TS + RUN_MINUTES * 60 * 1000;

// 发送按钮（优先 id，其次备用坐标）
var SEND_BTN_ID = "iv_send";
var SEND_BTN_BOUNDS = {x1: 886, y1: 2087, x2: 1023, y2: 2183};

// 左上角消息入口（你的矩形）
var TOP_LEFT_MSG_RECT = {x1:48, y1:739, x2:144, y2:808};

// 新匹配提示/输入框提示/金句
var NEW_MATCH_HINTS = ["打招呼", "你好呀"];
var INPUT_HINTS = ["真诚一些，收获好感", "真诚一些，收货好感"];
var GREETINGS = [
    "你好呀，很高兴认识你～",
    "第一次打招呼有点紧张，但真诚满格！",
    "看到你的资料很有感觉，想多聊聊～",
    "同城打个卡，有时间一起走走吗？",
    "你的照片很治愈，想认识一下你。",
    "嘿，想和你做个认真聊天的朋友。",
    "周末有什么小计划？一起交换一下吧～",
    "被你的笑容吸引到，冒昧来问好～",
    "你好呀，今天心情如何？",
    "希望我这条消息能让你微笑 :)"
];

// 滑动与稳定参数
var GESTURE_MS = 220;
var INERTIA_WAIT_MS = 650;
var STABLE_REPEATS = 3;
var NO_MOVE_MAX = 2;

/************* 小工具 *************/
function fmt(ms){ var s=Math.max(0,Math.floor(ms/1000)),m=Math.floor(s/60),r=s%60; return m+"分"+(r<10?"0":"")+r+"秒"; }
function centerOfBounds(b){ return {cx: (b.left+b.right)/2 | 0, cy: (b.top+b.bottom)/2 | 0}; }
function tap(x,y){ click(x,y); }
function tapRect(r){ tap(((r.x1+r.x2)/2)|0, ((r.y1+r.y2)/2)|0); }
function rightSwipeBack(){ var y=Math.floor(device.height*0.5); swipe(10,y,Math.floor(device.width*0.85),y,300); sleep(250); }
function tryTapTopLeftBack(){ tap(64, Math.floor(device.height*0.12)); sleep(250); }

function getViewportSignature(){
    var nodes = classNameMatches(/.*/).find();
    var items = [];
    for (var i=0;i<nodes.length;i++){
        var n=nodes[i]; if(!n.visibleToUser()) continue;
        var b=n.bounds(); if(!b) continue;
        var t=n.text()||n.desc()||"";
        if(t) items.push(t+"|"+b.top+","+b.bottom);
    }
    items.sort();
    return items.slice(-20).join("§");
}
function waitStable(timeoutMs, stableRepeats){
    var end=Date.now()+timeoutMs, prev=null, stable=0;
    while(Date.now()<end){
        var sig=getViewportSignature();
        if(sig===prev){ stable++; if(stable>=stableRepeats) return true; }
        else { stable=0; prev=sig; }
        sleep(120);
    }
    return false;
}

/************* 启动与进入消息列表 *************/
function clickBottomTabMessages(){
    var msgTab = text("消息").findOne(1500) || textContains("消息").findOne(1500);
    if(!msgTab){ log("【错误】未找到底部『消息』Tab"); exit(); }
    var b = msgTab.bounds(); var c = centerOfBounds(b);
    tap(c.cx, c.cy); sleep(350);
}
function clickTopLeftMessageEntry(){ tapRect(TOP_LEFT_MSG_RECT); sleep(350); }
function launchAndGotoMessageList(){
    auto.waitFor();
    app.launchPackage(APP_PKG); sleep(500);
    waitForPackage(APP_PKG);    sleep(500);
    clickBottomTabMessages();
    clickTopLeftMessageEntry();
}

/************* 底部“消息”徽章检测（加强版） *************/
function isDigits(s){ return /^[0-9]+$/.test(s); }
function hasBottomMessageBadge(){
    var tabNode = text("消息").findOne(300);
    var area = null;
    if(tabNode){
        var tb = tabNode.bounds();
        area = {left: Math.max(0, tb.left-140), right: Math.min(device.width, tb.right+140),
            top: Math.max(0, tb.top-140),   bottom: Math.min(device.height, tb.bottom+140)};
    }else{
        area = {left: Math.floor(device.width*0.30), right: Math.floor(device.width*0.70),
            top: Math.floor(device.height*0.88), bottom: device.height};
    }

    var nodes = classNameMatches(/.*/).find();
    for(var i=0;i<nodes.length;i++){
        var n = nodes[i]; if(!n.visibleToUser()) continue;
        var b = n.bounds(); if(!b) continue;
        if(b.left>=area.left && b.right<=area.right && b.top>=area.top && b.bottom<=area.bottom){
            var t = n.text() || "";
            var d = n.desc ? (n.desc()||"") : "";
            if((t && isDigits(t)) || (d && isDigits(d))) return true; // 数字（text/desc）
            if(!t && !d){ // 纯红点（小视图）
                var w=b.right-b.left, h=b.bottom-b.top;
                if(w>6 && h>6 && w<90 && h<90) return true;
            }
            // 看父节点 desc
            var p = n.parent();
            for(var up=0; up<3 && p; up++){
                var pd = p.desc ? p.desc() : "";
                if(pd && isDigits(pd)) return true;
                p = p.parent();
            }
        }
    }
    return false;
}

/************* 列表：采集本屏未读（数字徽章）并生成点击坐标 *************/
function collectUnreadEntriesOnScreen(){
    var nodes = classNameMatches(/.*/).find();
    var result = [];
    for (var i=0;i<nodes.length;i++){
        var n = nodes[i];
        if(!n.visibleToUser()) continue;
        var t = (n.text() || n.desc() || "");
        if(!t) continue;
        if(/^[0-9]+$/.test(t) && t.indexOf(":")===-1){
            var b = n.bounds(); if(!b) continue;
            if(b.right < device.width*0.6) continue;
            if((b.right-b.left) > device.width*0.4) continue;

            var row=null, cur=n;
            for (var up=0; up<7; up++){
                if(!cur) break;
                var cb=cur.bounds();
                if(cb && (cur.clickable() || cur.className()==="android.view.ViewGroup")){
                    if(cb.right-cb.left>device.width*0.7 && cb.bottom-cb.top>100){ row=cur; break; }
                }
                cur=cur.parent();
            }
            var pt;
            if(row){ var rb=row.bounds(); var cc=centerOfBounds(rb); pt={x:cc.cx,y:cc.cy}; }
            else    { var cc2=centerOfBounds(b); pt={x:cc2.cx,y:cc2.cy}; }
            var fallback={x: Math.floor(device.width*0.18), y: Math.floor((b.top+b.bottom)/2)};

            result.push({ badgeNode:n, y:(b.top+b.bottom)/2, clickPoint:pt, fallbackPoint:fallback });
        }
    }
    result.sort(function(a,b){ return a.y - b.y; });
    return result;
}
function enterConversationByCoords(entry){
    tap(entry.clickPoint.x, entry.clickPoint.y); sleep(450);
    if (text("消息").exists() && entry.badgeNode && entry.badgeNode.visibleToUser()){
        tap(entry.fallbackPoint.x, entry.fallbackPoint.y); sleep(450);
    }
}

/************* 会话内逻辑 *************/
function hasMyOutgoingMessage(){
    var topGuard = Math.floor(device.height * 0.18);
    var bottomGuard = Math.floor(device.height * 0.78);
    var rightThreshold = Math.floor(device.width * 0.60);

    var nodes = classNameMatches(/.*/).find();
    for (var i=0;i<nodes.length;i++){
        var n=nodes[i]; if(!n.visibleToUser()) continue;
        var b=n.bounds(); if(!b) continue;
        if(b.top < topGuard || b.bottom > bottomGuard) continue;

        var txt = n.text() || "";
        if (txt && b.right > rightThreshold && b.left > device.width*0.3) return true;
        if (!txt && b.right > rightThreshold && (b.bottom-b.top)>120 && (b.right-b.left)>120){
            if ((b.right-b.left) < device.width*0.7) return true;
        }
    }
    return false;
}
function isNewMatchByHints(){
    for (var i=0;i<NEW_MATCH_HINTS.length;i++){
        var k=NEW_MATCH_HINTS[i];
        if(textContains(k).exists() || descContains(k).exists()) return true;
    }
    return false;
}
function focusInputBox(){
    for (var i=0;i<INPUT_HINTS.length;i++){
        var k=INPUT_HINTS[i];
        var t=textContains(k).findOne(400);
        if(!t) t=descContains(k).findOne(200);
        if(t){ var b=t.bounds(); var c=centerOfBounds(b); tap(c.cx,c.cy); sleep(150); return true; }
    }
    var edit=className("android.widget.EditText").findOne(400);
    if(edit){ var eb=edit.bounds(); var ec=centerOfBounds(eb); tap(ec.cx,ec.cy); sleep(150); return true; }
    return false;
}
function sendGreetingOnce(){
    if(!focusInputBox()){ log("【提示】未找到输入框，跳过发送"); return false; }
    var msg=GREETINGS[Math.floor(Math.random()*GREETINGS.length)];
    setText(msg); sleep(150);

    var btn=id(SEND_BTN_ID).findOne(500);
    if(btn && btn.clickable()){ btn.click(); sleep(180); log("【已发】"+msg); return true; }
    var x=(SEND_BTN_BOUNDS.x1+SEND_BTN_BOUNDS.x2)/2|0;
    var y=(SEND_BTN_BOUNDS.y1+SEND_BTN_BOUNDS.y2)/2|0;
    tap(x,y); sleep(180); log("【已发(备用坐标)】"+msg); return true;
}
function handleConversation(){
    if (hasMyOutgoingMessage()){
        log("[会话] 我方已发过消息 → 返回");
    }else{
        if (isNewMatchByHints()){ log("[会话] 新匹配 → 发金句"); sendGreetingOnce(); }
        else { log("[会话] 无我方记录且无新匹配提示 → 发一条"); sendGreetingOnce(); }
    }
    rightSwipeBack();
    if(text("消息").exists()) return;
    tryTapTopLeftBack();
    if(text("消息").exists()) return;
    back();
}

/************* 一屏处理：把本屏未读全部点完；每个会话后“校正一次消息Tab” *************/
function handleCurrentScreenUnread(){
    var entries = collectUnreadEntriesOnScreen();
    if(entries.length === 0){
        log("[本屏] 没有数字未读徽章");
        return false;
    }
    log("[本屏] 未读会话数："+entries.length);
    for (var i=0;i<entries.length;i++){
        enterConversationByCoords(entries[i]);
        handleConversation();
        // ★ 校正：每处理完一个会话，强制点一次底部“消息”Tab，防止误跳到“发现”等页
        clickBottomTabMessages();
        sleep(200);
    }
    return true;
}

/************* 滑一屏并等待稳定；返回是否“确实有移动” *************/
function scrollOneScreenWaitStable(){
    var before = getViewportSignature();

    var sc=scrollable(true).findOne(250);
    if(sc && sc.scrollForward()){
        sleep(320);
    }else{
        var cx=Math.floor(device.width*0.5);
        var sy=Math.floor(device.height*0.85);
        var ey=Math.floor(device.height*0.15);
        gestures([GESTURE_MS,[cx,sy],[cx,ey]]);
        waitStable(INERTIA_WAIT_MS, STABLE_REPEATS);
    }

    var after = getViewportSignature();
    return before !== after;
}

/************* 主流程 *************/
(function main(){
    log("【启动】积目自动已读（每会话后校正消息Tab） 目标 "+RUN_MINUTES+" 分钟");
    launchAndGotoMessageList();

    var consecutiveNoBadge = 0;

    while(Date.now() < __DEADLINE){
        // 先把本屏未读点完
        var handled = handleCurrentScreenUnread();

        // 每轮也校正一次（防御性）
        clickBottomTabMessages();

        // 底部徽章检查
        if(!hasBottomMessageBadge()){
            consecutiveNoBadge++;
            log("[检查] 底部徽章不存在（"+consecutiveNoBadge+"/2）");
        }else{
            consecutiveNoBadge = 0;
        }

        if(consecutiveNoBadge >= 2 && !handled){
            log("【完成】底部徽章连续两次不存在，且本屏无未读 → 退出脚本");
            break;
        }

        // 滑一屏再判断
        var noMoveCount = 0;
        var moved = scrollOneScreenWaitStable();
        if(!moved){
            noMoveCount++;
            if(noMoveCount >= NO_MOVE_MAX){
                log("[滚动] 连续滑不动，可能到底部");
                if(!hasBottomMessageBadge()){
                    log("【完成】到底且无底部徽章 → 退出脚本");
                    break;
                }else{
                    // 到底但仍有徽章，回顶部再扫一轮
                    for(var k=0;k<3;k++){
                        var cx2=Math.floor(device.width*0.5);
                        var sy2=Math.floor(device.height*0.2);
                        var ey2=Math.floor(device.height*0.9);
                        gestures([220,[cx2,sy2],[cx2,ey2]]);
                        sleep(220);
                    }
                    clickBottomTabMessages(); // 回顶后再校正一次
                }
            }
        }
    }

    log("【结束】脚本已运行 "+fmt(Date.now()-__START_TS)+"（目标 "+RUN_MINUTES+" 分钟）");
})();
