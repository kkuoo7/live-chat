const express = require("express"); 
const path = require("path"); 
const morgan = require('morgan'); 
const cookieParser = require("cookie-parser");
const session = require("express-session"); 
const nunjucks = require("nunjucks"); 
const dotenv = require("dotenv"); 
const ColorHash = require('color-hash').default;

dotenv.config(); 
const webSocket = require("./socket.js");
const indexRouter = require("./routes/index.js");
const connect = require("./schemas");

const app = express(); 
app.set("port",process.env.NODE_ENV || 8085); // process.env.NODE_ENV 가 없으면 8085 

app.set('view engine', 'html');
nunjucks.configure('views', {
  express: app,
  watch: true,
});
connect(); 

const sessionMiddleware = session({
    resave : false, 
    saveUninitialized : false,
    secret : process.env.COOKIE_SECRET, 
    cookie : {
        httpOnly : true, 
        secure : false,
    }, 
}); 


app.use(morgan("dev")); // 요청과 응답에 대한 콘솔을 기록한다. 
app.use(express.static(path.join(__dirname,'public'))); // public 폴더안의 정적파일을 브라우저에 적용하게 해준다. 
// 파일이 없으면 작동으로 next를 호출한다. 
app.use("/gif",express.static(path.join(__dirname,'uploads')));

// body-parser 미들웨어 : 요청의 본문에 있는 데이터를 해석하여 req.body 객체로 만들어주는 미들웨어이다. 
// 단, 멀티파트 데이터(이미지, 동영상, 파일)는 multer 미들웨어로 처리해야 한다. 
// POST나 PUT 요청에서 보낸 데이터를 req.body안에 넣어준다. 
app.use(express.json()); // JSON 형식의 데이터를 req.body 안에 집어넣어준다. 
app.use(express.urlencoded({extended : false})); // url-encoded 형식의 데이터를 req.body 안에 집어넣어준다. 
// falses는 querystring 내장모듈을 사용하겠다는 뜻이다. 

// 요청에 동봉된 쿠키를 해석해 req.cookies 객체로 만들어준다.
// 비밀키를 인수로 넘긴 경우는 req.signedCookies 객체에 들어간다. 
app.use(cookieParser(process.env.COOKIE_SECRET)); 

// 세션을 사용자 별로 req.session 객체안에 넣고 서버종료까지 유지시킨다. 
app.use(sessionMiddleware);

app.use((req,res,next)=>{
    if(!req.session.color) { //req.session 객체에 color가 없을 때 
        const colorHash = new ColorHash(); 

        req.session.color = colorHash.hex(req.sessionID);
        // 이렇게 함으로써 개별 사용자마다 HEX형식의 색상 문자열을 가지게하여 
        // 색을 입히고 사용자를 구별할 수 있게 만든다.
    }

    next();
})

app.use("/",indexRouter); 

app.use((req,res,next)=>{ // 특정 라우터에 해당하는 미들웨어가 실행되지 않았다면 이 미들웨어가 실행된다. 
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다`); 
    // 아무것도 걸리는 것 없이 통과했으니 해당 라우터가 없다는 뜻이다. 
    error.status = 404; 
    next(error);
}); 

app.use((err,req,res,next)=>{ // 어떤 미들웨어서든, next(err)이 호출되면 일로 간다. 
    res.locals.message = err.message; 
    res.locals.error = process.env.NODE_ENV !== "production" ? err : {}; 
    res.status(err.status || 500); 
    res.render('error.html'); 
})

const server = app.listen(app.get("port"),()=>{
    console.log(app.get("port") + '번에서 대기중입니다.');
})


webSocket(server,app,sessionMiddleware); 