var msg = null;
var paragraph = 1024*1024*2;  //每次分片传输文件的大小 10M
var blob = null;//  分片数据的载体Blob对象
var fileList = null; //传输的文件
var uploadState = 0;  // 0: 无上传/取消， 1： 上传中， 2： 暂停

//初始化消息框
function init(){
    msg = document.getElementById("msg");

}
function uploadFiles(){
    if(fileList != null && fileList.files.length>0){
        //将上传状态设置成1
        uploadState = 1;
        for(var i = 0; i< fileList.files.length; i++){
            var file = fileList.files[i];
            uploadFileInit(file,i);
        }
    }else{
        msg.innerHTML = "请选择上传文件！";
    }
}

/**
 * 清除选中的文件
 */
function clearFiles() {
    fileList = null;
    // location.reload();//21ms
    // history.go(0);//22ms
    location.replace(location);//8ms

}


/**
 * 获取服务器文件大小，开始续传
 * @param file
 * @param i
 */
function uploadFileInit(file,i){
    if(file){
        var startSize = 0;
        var endSize = 0;
        // var date = file.lastModifiedDate;
        var date = new Date(file.lastModified);

        var lastModifyTime = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+"-"
            +date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds();
        //获取当前文件已经上传大小
        jQuery.post("file/upload/getExistFileSize",
            {"fileName":encodeURIComponent(file.name),"fileSize":file.size,"lastModifyTime":lastModifyTime},
            function(data){
                if(data != -1){
                    endSize = Number(data);
                }
                uploadFile(file,startSize,endSize,i);
            });
    }
}
/**
 * 分片上传文件
 */
function uploadFile(file,startSize,endSize,i) {
    // var date = file.lastModifiedDate;
    var date = new Date(file.lastModified);

    var lastModifyTime = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+"-"
        +date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds();
    var reader = new FileReader();
    // 数据读取成功完成时触发
    reader.onload = function loaded(evt) {
        // 构造 XMLHttpRequest 对象，发送文件 Binary 数据
        var xhr = new XMLHttpRequest();
        xhr.sendAsBinary = function(text){
            var data = new ArrayBuffer(text.length);
            var ui8a = new Uint8Array(data, 0);// 无符号8位整数数组
            for (var i = 0; i < text.length; i++) ui8a[i] = (text.charCodeAt(i) & 0xff);// 与 0xff 进行与运算，保证没有负数
            this.send(ui8a);
        };
        // 设置监听
        xhr.onreadystatechange = function(){
            if(xhr.readyState==4){
                //表示服务器的相应代码是200；正确返回了数据
                if(xhr.status==200){
                    //接收返回数据，为当前文件大小。
                    var message=xhr.responseText;
                    message = Number(message);
                    uploadProgress(file,startSize,message,i);
                } else{
                    msg.innerHTML = "上传出错，服务器相应错误！";
                }
            }
        };//创建回调方法
        xhr.open("POST",
            "file/upload/appendFile?fileName=" + encodeURIComponent(file.name)+"&fileSize="+file.size+"&lastModifyTime="+lastModifyTime,
            false);
        xhr.overrideMimeType("application/octet-stream;charset=utf-8");
        // 设置请求头
        // xhr.setRequestHeader();
        // 将result中的blob数据发送到后端
        xhr.sendAsBinary(evt.target.result);
        // xhr.send(evt.target.result);
    };
    // 分片读取文件内容
    if(endSize < file.size){
        //处理文件发送（字节）
        startSize = endSize;
        if(paragraph > (file.size - endSize)){
            endSize = file.size;
        }else{
            endSize += paragraph ;
        }
        // 切分读取文件，从起始位置开始读取，到结束位置
        if (file.webkitSlice) {
            //webkit浏览器
            blob = file.webkitSlice(startSize, endSize);
        }else{
            blob = file.slice(startSize, endSize);
        }
        // 读取文件blob中的内容，一旦完成，将触发reader.onload 方法，且result属性中将包含所读取文件的二进制数据。
        reader.readAsBinaryString(blob);
        // reader.readAsArrayBuffer(blob);
    }else{
        document.getElementById('progressNumber'+i).innerHTML = '100%';
    }
}

//显示处理进程
function uploadProgress(file,startSize,uploadLen,i) {
    var percentComplete = Math.round(uploadLen * 100 / file.size);
    document.getElementById('progressNumber'+i).innerHTML = percentComplete.toString() + '%';
    //续传
    if(uploadState == 1){
        uploadFile(file,startSize,uploadLen,i);
    }
}

/*
暂停上传
*/
function pauseUpload(){
    uploadState = 2;
}

/**
 * 选择文件之后触发事件
 * 展示文件的文件名和大小
 */
function fileSelected() {
    // 获取上传的文件列表
    fileList = document.getElementById('fileToUpload');
    // 获取文件的个数
    var length = fileList.files.length;
    // 获取元素 id为fileFrame 的div
    var frame = document.getElementById('fileFrame');

    for(var i=0; i<length; i++){
        file = fileList.files[i];
        // alert(new Date(file.lastModified));
        if(file){
            var fileSize = 0;
            if (file.size > 1024 * 1024)
                fileSize = (Math.round(file.size * 100 / (1024 * 1024)) / 100).toString() + 'MB';
            else
                fileSize = (Math.round(file.size * 100 / 1024) / 100).toString() + 'KB';
            var nameDiv = document.createElement("div");
            // alert(frame);
            nameDiv.setAttribute("id","fileName"+i);
            nameDiv.innerHTML='文件名: ' + file.name;
            var sizeDiv = document.createElement("div");
            sizeDiv.setAttribute("id","fileSize"+i);
            sizeDiv.innerHTML='文件大小: ' + fileSize;
            var typeDiv = document.createElement("div");
            typeDiv.setAttribute("id","progressNumber"+i);
            typeDiv.innerHTML='';
        }
        frame.appendChild(nameDiv);
        frame.appendChild(sizeDiv);
        frame.appendChild(typeDiv);
    }
}