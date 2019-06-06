let helper = require('./../helpers')
const db = require("./../models");
let bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken'); 
const otpSecret = require("./../configuration/otp");
const otplib = require('otplib');




// Pass Hash
var authConfig = require('../configuration/auth');

generateToken = (user) =>{
    return jwt.sign(user, authConfig.secret, {
        expiresIn: 10080
    });
}

setUserInfo = (request) => {
    console.log("request",request)
    return {
        passcode:request.passcode,
        idnumber:request.idnumber,
        phonenumber:request.phonenumber
    }
}

// EOF Pass Hash

const iBookSignup = {}
const iBookLogin = {}
const iBookOTP = {}

// SMS PARAMETRES
const smsuser = 'KBSACCO'
const smspassword = 'KBSACCO1';   
const smsclientsmsid = 'YOURREFERENCENUMBER';
const smssenderid='KBSACCO';
const smsunicode=0;
// EOF SMS PARAMS

iBookSignup.post = (req,res) => {
    console.log("INCOMING SIGNUP DATA:", req.body)

    const saltRounds = 10;

    // PREP DATA FOR DB
    const {
        userName,
        phoneNumber,
        password,
        otp
    } = req.body;  
    
    bcrypt.genSalt(saltRounds).then(salt => {
        return bcrypt.hash(req.body.data.password,salt)
    }).then(hash => {
        db.UserSchema.findOne({
            userName: req.body.data.userName
        },(err,doc)=>{
            console.log(doc)
            if(doc){
                console.log("USER WITH THAT PHONE NUMBER EXISTS")
                // HANDLE USER EXISTS - REDIRECT TO LOGIN
    
                res.status(200).json({
                    success: true,
                    exist: true
                }) 
            } else {
                console.log("USER DON'T EXIST",doc)
                // HANDLE DATA UPLOAD TO DB
                let OTP = otplib.authenticator.generate(otpSecret.secret)
                console.log("OTP:",OTP)

                let newUser = db.UserSchema({
                    userName:req.body.data.userName,
                    phoneNumber:req.body.data.phoneNumber,
                    password:hash,
                    otp:OTP
                },()=>console.log("newUser: ",newUser))
                .save()
                .then((newUser)=>{
                    let sms = `Hi, thank you for joining Goose Links, your One Time Password is ${OTP}`; 
                    let URL = `http://messaging.openocean.co.ke/sendsms.jsp?user=${smsuser}&password=${smspassword}&mobiles=${req.body.data.phoneNumber}&sms=${sms}&clientsmsid=${smsclientsmsid}&senderid=${smssenderid}`
                    
                    helper.sendMessage(URL)                           
                    res.status(200).json({
                        success:true,
                        doc:newUser,
                        exist:false
                    })
                })    
            }
        })
    })
}

iBookLogin.post = (req,res) => {
    console.log("INCOMING LOGIN DATA:", req.body)
    db.UserSchema.findOne({
        userName:req.body.data.userName
    },(err,docs) => {
        if(docs){
            bcrypt.compare(req.body.data.password,docs.password,(err,response) => {
                if(response){
                    return res.status(200).json({
                        success: true,
                        data: docs
                    })
                }else if(err){
                    throw new Error;
                }
            })
        }
    })
}

iBookOTP.post = (req,res) => {
    console.log("INCOMING OTP DATA:", req.body)
    let data = {
        otp:req.body.val2.onetimepassword,
        phoneNumber: req.body.val1.data.doc.phoneNumber
    }

    console.log(data)

    db.UserSchema.findOneAndUpdate({
        phoneNumber:data.phoneNumber
    },{
        verified: true
    }).then(()=>{
        db.UserSchema.find({
            phoneNumber: req.body.val1.data.doc.phoneNumber,
            verified:true
        },(err,docs)=>{
            if (err) throw Error;
            if(docs){
                res.status(200).json({
                    success:true,
                    docs:docs
                })
            } else if(!docs){
                res.status(200).json({
                    success:false
                })
            }
        })
    })
    // COMPARE OTP
    // IF MATCH MARK USER AS VERIFIED
}


module.exports = {
    iBookSignup,
    iBookLogin,
    iBookOTP
}