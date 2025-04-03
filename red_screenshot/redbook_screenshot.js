// 需要权限：无障碍服务、截图权限、Auto.js Pro

auto.waitFor();

const SERVER = "http://192.168.31.60:8001";
const GET_LINK = SERVER + "/get-link";
const UPLOAD = SERVER + "/upload";

function getXHSLink() {
    let res = http.get(GET_LINK);
    let json = res.body.json();
    return json.url;
}

function openXiaohongshu(url) {
    toast("打开小红书链接...");
    app.startActivity({
        action: "android.intent.action.VIEW",
        data: url
    });
}

function captureAndUpload() {
    if (!requestScreenCapture()) {
        toast("请求截图权限失败");
        exit();
    }

    sleep(8000);  // 等待页面加载
    let img = captureScreen();
    let path = "/sdcard/xhs_" + new Date().getTime() + ".png";
    images.save(img, path);

    toast("截图完成，上传中...");

    let r = http.postMultipart(UPLOAD, {
        file: open(path)
    });

    toast("上传完成：" + r.body.string());
}

// 主程序
function main() {
    let url = getXHSLink();
    toast("拿到链接：" + url);
    openXiaohongshu(url);
    captureAndUpload();
}

main();
