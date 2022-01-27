const express = require('express');
const dotenv = require('dotenv')
const path  = require('path')
require('dotenv').config({path:path.resolve(__dirname+'/config/.env')})
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session);
const { Client } = require('pg')
const {pool} = require('./config/db');

const app = express();

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs')
app.use(express.urlencoded({extended:false}))
app.use(express.static(path.join(__dirname,'/public')))

app.use(session({
    store: new pgSession({
        pool:pool,
        tableName:'session' 
    }),
    secret:'secret',
    resave:false,
    saveUninitialized:false,
}))


const ensureAuth = (req,res,next)=>{
    if(req.session.isAuth){
        next();
    }else{
        res.redirect('/login')
    }
}

const ensureGuestTeacher = (req,res,next)=>{
    if(req.session.isAuth){
        res.redirect('/teacher/dashboard')
    }else{
        return next()
    }
}

const ensureGuestStudent = (req,res,next)=>{
    if(req.session.isAuth){
        res.redirect('/student/dashboard')
    }else{
        return next()
    }
}

// Home
app.get('/', ensureGuestStudent, ensureGuestTeacher,(request, response)=>{
    response.render('home');
})

// Student/Teacher Login
app.get('/login',ensureGuestStudent, ensureGuestTeacher,(request, response)=>{
    response.render('login')
})

app.post('/login', async (request, response)=>{
    let {email, password} = request.body;

    var student = await pool.query('SELECT * FROM student WHERE email = $1',[email])

    if(!(student.rows.length>0)){
        var teacher = await pool.query('SELECT * FROM teacher WHERE email = $1',[email])
        if(teacher.rows[0].password === password){
            request.session.isAuth = true
            request.session.role = 'teacher'
            request.session.user = teacher.rows[0]
            request.session.save();
            var myCourse = await pool.query('SELECT name FROM course WHERE id = $1',[teacher.rows[0].courseid])
            // console.log(myCourse.rows)
            var myStudents = await pool.query('select s.id, s.name from "class" cl join  "student" s on cl.teacherid = $1 and cl.studentid = s.id',[teacher.rows[0].id])
            console.log(myStudents.rows)
            response.render('teacherDashboard',{teacher:request.session.user, myCourse: myCourse.rows[0], myStudents: myStudents.rows})
        }
        else response.redirect('/login')    
    }else {
        if(student.rows[0].password === password){
            request.session.isAuth = true
            request.session.role = 'student'
            request.session.user = student.rows[0]
            request.session.save();
            var courses = await pool.query('SELECT * FROM course');
            // console.log(courses.rows)
            var myCourses = await pool.query('select t.id, t.name as teacher, c.name from "teacher" t, "course" c where t.id in (select cl.teacherid from "class" cl where cl.studentid = $1 ) and c.id = t.courseid',[parseInt(student.rows[0].id)])
            // console.log(myCourses.rows)
            response.render('studentDashboard',{student:request.session.user,courses:courses.rows, myCourses: myCourses.rows})
        }
        else response.redirect('/login')
    }

})

// Student signup
app.get('/student/signup', ensureGuestStudent,(request, response)=>{
    response.render('studentSignup')
})

app.post('/student/signup', async (request, response)=>{
    let {name, email, password, cpassword} = request.body

    var result = await pool.query('INSERT INTO student(name, email, password) VALUES($1, $2, $3)',[name, email, password]);
    response.redirect('/login')
})

// Student Dashboard
app.get('/student/dashboard',ensureAuth,async (request, response)=>{
    var courses = await pool.query('SELECT * FROM course');
    var myCourses = await pool.query('select t.id, t.name as teacher, c.name from "teacher" t, "course" c where t.id in (select cl.teacherid from "class" cl where cl.studentid = $1 ) and c.id = t.courseid',[parseInt(request.session.user.id)])
    response.render('studentDashboard',{student:request.session.user,courses:courses.rows, myCourses: myCourses.rows})
})

// Update Student
app.get('/student/update',ensureAuth,(request, response)=>{
    response.render('update',{email:request.session.user.email});
})

app.post('/student/update',async (request, response)=>{
    var result = await pool.query('UPDATE student SET name = $1, password = $2 WHERE id = $3',[request.body.name, request.body.password, request.session.user.id])
    request.session.user.name = request.body.name
    request.session.user.password = request.body.password
    request.session.save()
    response.redirect('/student/dashboard')
})

// Delete Student
app.post('/student/delete',async (request, respone)=>{
    var result = await pool.query('DELETE FROM student WHERE id = $1', [request.session.user.id])
    request.session.destroy()
    respone.redirect('/')
})

// Teacher Dashboard
app.get('/teacher/dashboard',ensureAuth, ensureGuestTeacher,async(request, response)=>{
    var myCourse = await pool.query('SELECT name FROM course WHERE id = $1',[request.session.user.courseid])
    var myStudents = await pool.query('select s.id, s.name from "class" cl join  "student" s on cl.teacherid = $1 and cl.studentid = s.id',[request.session.user.id])
    response.render('teacherDashboard',{teacher:request.session.user, myStudents: myStudents.rows, myCourse: myCourse.rows[0]})
})

// Select Course for Student
app.post('/selectcourse', async(request, response)=>{
    let courseNumber = request.body.coursenumber
    var result = await pool.query('INSERT INTO class(courseid, teacherid, studentid) SELECT $1,t.id,$2 FROM teacher t where t.courseid = $1',[parseInt(courseNumber), parseInt(request.session.user.id)])
    response.redirect('/student/dashboard')
})

// Remove Student from Course by Teacher
app.post('/remove', async(request, response)=>{
    var result = await pool.query('DELETE FROM class WHERE studentid = $1 and teacherid = $2',[request.body.id,request.session.user.id])
    response.redirect('/teacher/dashboard')
})

// Unenroll from a course for Student
app.post('/unenroll', async(request, response)=>{
    var result = await pool.query('DELETE FROM class WHERE studentid = $1 and teacherid = $2',[request.session.user.id, request.body.id])
    response.redirect('student/dashboard')
})

// Logout
app.post('/logout',async (request,response)=>{
    request.session.isAuth=false
    request.isAuthenticated=false
    request.session.destroy()
    response.redirect('/')
})

// Listening to the Server
app.listen(PORT,(err)=>{
    if(err){
        console.log(err);
    }
    console.log(`Server connected to port ${PORT}`);
})