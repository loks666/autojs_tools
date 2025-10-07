/************* 运行时长控制 *************/
const RUN_MINUTES = 5;                 // ← 想跑多久（分钟）就改这里
const __START_TS = Date.now();
const __DEADLINE = __START_TS + RUN_MINUTES * 60 * 1000;
function fmt(ms){
    let s = Math.max(0, Math.floor(ms/1000));
    let m = Math.floor(s/60);
    let r = s%60;
    return (m+"分"+(r<10?"0":"")+r+"秒");
}
log("【启动】积目App已启动(目标运行 "+RUN_MINUTES+" 分钟，截止后自动停止)");

/************* App 启动与进入『发现』 *************/
auto.waitFor();
app.launchPackage("com.fenzotech.jimu"); sleep(500);
waitForPackage("com.fenzotech.jimu");    sleep(500);

// ===== 坐标配置 =====
// 发现页 → 详情页 的右下角触发区（你称为“详情箭头”）
const ENTER_AREA = {x1:906, y1:1834, x2:993, y2:1921};
// 详情页底部按钮：小心心 & 叉号
const HEART_BTN  = {x1:226, y1:2187, x2:336, y2:2297};
const CLOSE_BTN  = {x1: 43, y1:2187, x2:153, y2:2297};
// 空动态插画 ID
const EMPTY_ID = "com.fenzotech.jimu:id/userEmptyLayout";

// ===== 工具函数 =====
function tapCenterOfRect(r){
    const cx = ((r.x1 + r.x2) / 2) | 0;
    const cy = ((r.y1 + r.y2) / 2) | 0;
    click(cx, cy); sleep(350);
    return {cx, cy};
}
function clickRect(r, label){
    const p = tapCenterOfRect(r);
    log("【点击】『" + label + "』（坐标：" + p.cx + "," + p.cy + "）");
}
function inDetailStrict(){
    // 详情页特征：发现页卡片消失 + 出现“打招呼/发消息”
    const hasDetailAction = textMatches(/打招呼|发消息/).exists();
    const discoverCardsGone = !id("card_user_info").exists();
    return hasDetailAction && discoverCardsGone;
}
function goDiscover(){
    // 确保在『发现』页
    let tab = textContains("发现").findOne(3000);
    if (!tab) { log("【错误】未找到『发现』入口"); exit(); }
    if (!tab.click()) { let b = tab.bounds(); click(b.centerX(), b.centerY()); }
    sleep(500);
    log("【步骤】已进入『发现』页面");
}
function enterDetail(maxTries){
    maxTries = maxTries || 3;
    for (let i=1;i<=maxTries;i++){
        log("【进入详情】第 " + i + " 次尝试：点击『详情箭头』");
        const p = tapCenterOfRect(ENTER_AREA);
        log("【点击】『详情箭头』（坐标：" + p.cx + "," + p.cy + "）");
        sleep(600);
        if (inDetailStrict()){ log("【进入详情】已进入详情页（通过详情箭头）"); return true; }

        // 备用：页面中部（避免误点底部导航）
        const sx = (device.width*0.5)|0, sy = (device.height*0.60)|0;
        log("【进入详情】备用：点击『页面中部』再次尝试");
        click(sx, sy); sleep(700);
        if (inDetailStrict()){ log("【进入详情】已进入详情页（通过页面中部）"); return true; }

        // 再兜底：轻滑后重试
        swipe(device.width*0.5, device.height*0.75, device.width*0.5, device.height*0.58, 260);
        sleep(500);
    }
    return false;
}

/************* 主循环：直到时间用完 *************/
let round = 0;
while (Date.now() < __DEADLINE) {
    round++;
    log("——— 第 "+round+" 轮开始（已用 "+fmt(Date.now()-__START_TS)+"，剩余 "+fmt(__DEADLINE-Date.now())+"）———");

    // 1) 进入『发现』
    goDiscover();

    // 2) 进入详情
    if (!enterDetail(3)) { log("【错误】进入详情失败，本轮跳过"); sleep(800); continue; }
    log("【步骤】确认处于『详情页』");

    // 3) 详情页先查“真实头像”
    if (textContains("真实头像").exists()){
        log("【判断-详情】检测到『真实头像』字样 → 直接点击『小心心』");
        clickRect(HEART_BTN, "小心心");
    } else {
        log("【判断-详情】未检测到『真实头像』 → 下滑一屏后做二选一判断");
        // 下滑一屏
        swipe(device.width*0.5, device.height*0.78, device.width*0.5, device.height*0.28, 300);
        sleep(400);
        // 二选一：空插画=机器人=点叉；出现“月”=真人=点小心心
        const hasEmptyIllustration = id(EMPTY_ID).exists();
        const hasCharYue = textContains("月").exists();
        if (hasEmptyIllustration){
            log("【判定】机器人：检测到『用户空动态插画』 → 点击『叉号』");
            clickRect(CLOSE_BTN, "叉号");
        } else if (hasCharYue){
            log("【判定】真人：检测到『月』字 → 点击『小心心』");
            clickRect(HEART_BTN, "小心心");
        } else {
            log("【判定】未命中『空插画/“月”』任一规则，本轮不点击");
        }
    }

    // 4) 返回发现（为下一轮做准备）
    back(); sleep(400); // 返回详情上一层
    goDiscover();

    // 5) 如果时间到了就结束；否则可稍作间隔
    if (Date.now() >= __DEADLINE) break;
    sleep(600);
}

log("【结束】脚本已运行 "+fmt(Date.now()-__START_TS)+"（目标 "+RUN_MINUTES+" 分钟）");
