// 채팅 스키마(테이블)

const mongoose = require("mongoose"); 

const {Schema} = mongoose; 
const {Types : {ObjectId} } = Schema; 
// Schema 안에 Types 안에 ObjectId 

const chatSchema = new Schema({

    room : {
        type : ObjectId, 
        required : true, 
        ref : "Room", 
    }, 

    user : {
        type : String, 
        required : true, 
    }, 

    chat : String, 

    gif : String, // gif 이미지 주소 

    createdAt : {
        type : Date, 
        default : Date.now(),
    }
}); 

module.exports = mongoose.model("Chat",chatSchema); 