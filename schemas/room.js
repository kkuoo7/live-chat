// 채탕방 스키마(테이블)

const mongoose = require("mongoose"); 

const {Schema} = mongoose; 
const roomSchema = new Schema({
    title : {
        type : String, 
        required : true,
    }, 

    max : { // 수용인원 
        type : Number, 
        required : true, 
        default : 10, // 기본 10명 
        min : 2, // 최소 2명 
    },
    
    owner :  { // 방장 
        type : String, 
        required : true, 
    }, 

    password : String, // required가 없으므로 있으면 비밀방 없으면 공개방

    createdAt : {
        type : Date, 
        default : Date.now, 
    },
}); 

module.exports = mongoose.model("Room",roomSchema); 