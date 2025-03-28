// 开启无障碍服务
auto();

// ===== 参数配置 =====
let link = "https://applink.feishu.cn/T8V3q9uvOkJ6";
let label = "飞书打卡";

// ===== 判断是否是大陆工作日 =====
function isTodayWorkday() {
    let dateStr = new java.text.SimpleDateFormat("yyyyMMdd").format(new Date());
    log("请求工作日判断接口：" + dateStr);

    try {
        let res = http.get("https://api.apihubs.cn/holiday/get?date=" + dateStr);
        log("HTTP状态码: " + res.statusCode);

        if (res.statusCode != 200) {
            log("接口失败，默认当作工作日");
            return true;
        }

        let body = res.body.string();
        log("返回内容：" + body);

        let json = JSON.parse(body);
        let dayInfo = json && json.data && json.data.list && json.data.list[0];
        if (!dayInfo) {
            log("解析失败，默认当作工作日");
            return true;
        }

        let workday = dayInfo.workday === 1;
        let weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][dayInfo.week];

        log("今日是：" + weekday + "，" + (workday ? "工作日✅" : "非工作日❌"));
        return workday;
    } catch (err) {
        log("异常：" + err);
        toast("异常，默认当作工作日");
        return true;
    }
}

// ===== 执行打卡任务 =====
function executeTask() {
    toast("开始执行任务：" + label);
    log("打开链接：" + link);
    app.startActivity({
        action: "android.intent.action.VIEW",
        data: link
    });
}

// ===== 主流程 =====
if (isTodayWorkday()) {
    executeTask();
} else {
    toast("今天不是工作日，不执行打卡");
}
