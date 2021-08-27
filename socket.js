const SocketIO = require("socket.io"); 
const axios = require("axios");
const cookieParser = require("cookie-parser");
const cookie = require("cookie-signature");

module.exports = (server,app,sessionMiddleware) => {
    const io = SocketIO(server,{path : '/socket.io'}); 
    
    app.set("io",io); 
    // io를 마치 전역변수 처럼 활용하게 해줌. app.get("io")로 불러옴

    const room = io.of("/room");
    const chat = io.of('/chat'); 

    io.use((socket,next)=>{
        cookieParser(process.env.COOKIE_SECRET)(socket.request,socket.request.res || {}, next);
        sessionMiddleware(socket.request, socket.request.res || {}, next);
        // 미들웨어 확장하는 방법이다. 당황하지말자
    });

    room.on("connection", (socket)=> {
        console.log("room 네임스페이스 접속"); 

        socket.on("disconnect", ()=> {
            console.log("room 네임스페이스 접속 해제");
        })
    }); 

    chat.on("connection",(socket)=> {
        console.log("chat 네임스페이스에 접속"); 
        
        const req = socket.request; // 요청객체 
        const { headers : {referer}} = req; 
        // req.headers.referer 는 현재 웹 페이지의 URL이다. 

        const roomId = referer 
                        .split("/")[referer.split("/").length -1]
                        .replace(/\?.+/, ""); 
        console.log("This is referer in socket.js :",referer);
        // split은 seperator(구분자)를 기준으로 문자열을 배열로 만드는 함수
        // replace 정규식을 통해 ?와 매치되는 값들을 빈칸으로 변환한다.
        // 이 과정을 통해 방의 아이디 부분을 추출한다. 

        console.log("roomId :",roomId);
        socket.join(roomId); // Socket.IO에서 기본적으로 제공해주는 메소드1
        // join안의 인수로 넣은 문자열로 된 이름의 방을 만들고 그 방에 들어가게 해준다.
        // 참고로 Socket.IO는 채팅방을 만드는데 특화된 npm 패키지이다. 

        socket.to(roomId).emit('join',{
            user : 'system',
            chat : `${req.session.color}님이 입장하셨습니다. `
        })

        socket.on("disconnect",()=>{
            console.log("chat 네임스페이스 접속 해제");
            socket.leave(roomId); // 방에 나가는 메소드
            // join과 마찬가지로 Socket.IO가 기본적으로 제공해주는 메소드2
            // 연결이 끊기면 자동으로 밖에 나가지만 확실히 나가기 위해 추가함.

            const currentRoom = socket.adapter.rooms[roomId]; 
            console.log("Socket.js에서 currentRoom :",socket.adapter.rooms); 
            
            const userCount = currentRoom ? currentRoom.length : 0; 

            if(userCount === 0) { // 접속자가 0명이면 방을 삭제한다. 
                const signedCookie = req.signedCookies['connect.sid'];
                console.log("req.signedCookies : ",req.signedCookies);
                // express-session은 req.signedCookies['connect.sid']을 통해 요청자가 누구인지 판단합니다.
                // 하지만 브라우저와 반대로 서버에서 axios요청을 보낼 때 쿠키를 동봉하지 않아 express-session이 
                // 요청자가 누구인지 판별을 못한다. 
                // 따라서 socket.js에서 요청헤더에 암호화된 쿠키를 직접 넣어야 한다.


                const connectSID = cookie.sign(signedCookie,process.env.COOKIE_SECRET);
                // cookie-signature로 쿠키를 암호화한다.
                console.log("connectSID : ",connectSID);

                axios.delete(`http://localhost:8085/room/${roomId}`,{ 
                    // 서버에서 작성한 코드지만 클라이언트가 서버로 delete'요청'을 보내는 것이다.

                    headers : {
                        Cookie : `connect.sid=s%3A${connectSID}`
                        // express-session 세션쿠키 앞에 s3%A을 꼭 붙여야 한다.
                    }
                })
                    .then(()=>{
                        console.log('방 제거 요청 성공');
                    })
                    .catch((error)=>{
                        console.error("방 제거 요청 실패");
                        console.error(error); 
                    })
            } else {
                socket.to(roomId).emit('exit',{
                    user : "system",
                    chat : `${req.session.color}님이 퇴장하셨습니다.`
                })
            }
        });
    })
    









    // io.on('connection',(socket)=>{ // 웹소켓 연결 시 
    //     // io와 socket 객체가 Socket.IO의 핵심이다. 

    //     const req = socket.request; // 요청 객체의 접근 가능
    //     // socket.request.res 로 등답객체에 접근가능 

    //     const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //     console.log("새 클라이언트 접속!", ip,socket.id,req.ip); 
    //     //socket.id는 소켓 고유의 아이디고 이 아이디로 소켓의 주인이 누구인지 특정할 수 있다. 

    //     socket.on('disconnect',()=>{ // 연결 종료 시
    //         // 이번에는 io가 아니라 socekt에도 이벤트 리스너를 붙인다. 
    //         console.log("클라이언트 접속 해제",ip,socket.id); 
    //         clearInterval(socket.interval); 
    //     }); 

    //     socket.on('error',(error)=>{
    //         console.error(error); 
    //     }); 

    //     socket.on("reply",(data)=>{ // 사용자가 직접 만든 reply 이벤트 
    //         // 웹소켓은 양방향 통신이기에  클라이언트에서 reply 이벤트명으로 데이터를 보내야 한다. 
    //         console.log(data); 
    //     }); 

    //     socket.interval = setInterval(()=>{
    //         socket.emit("news","Hello Socket.IO"); 
    //         // emit은 클라이언트에세 메시지를 보내는 메서드인데 
    //         // "news"라는 사용자정의 이벤트 이름으로 "Hello ~~" 데이터를 클라이언트에게 보낸다. 
    //         // 클라이언트가 이 메시지를 받기위해서는 news이벤트 리스너를 만들어두어야 한다. 
    //     },2000); 
    // });
    
};

