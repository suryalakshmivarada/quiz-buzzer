const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ===============================
// SETTINGS
// ===============================

const MAX_STUDENTS = 200;

// Admin can change this from admin panel
let minimumStudents = 80;

const TEAMS = [
    "Agni",
    "Vayu",
    "Akash",
    "Jal",
    "Prudhvi"
];

// ===============================
// EXPRESS
// ===============================

app.use(express.static("public"));

// ===============================
// GAME DATA
// ===============================

const students = new Map();

let gameStarted = false;

let roundNumber = 0;

let buzzQueue = [];

let currentBuzzIndex = 0;

// ===============================
// HELPERS
// ===============================

function getStudents() {

    return Array.from(students.values());

}

function sendFullState() {

    io.emit("fullState", {

        students: getStudents(),

        minimumStudents,

        maxStudents: MAX_STUDENTS,

        gameStarted,

        roundNumber,

        buzzQueue,

        currentBuzzIndex

    });

}

// ===============================
// SOCKET CONNECTION
// ===============================

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    // Send current state to newly connected device
    socket.emit("fullState", {

        students: getStudents(),

        minimumStudents,

        maxStudents: MAX_STUDENTS,

        gameStarted,

        roundNumber,

        buzzQueue,

        currentBuzzIndex

    });


    // =====================================
    // STUDENT JOIN
    // =====================================

    socket.on("joinGame", (data) => {

        if (gameStarted) {

            socket.emit("joinError",
                "The game has already started."
            );

            return;
        }

        if (students.size >= MAX_STUDENTS) {

            socket.emit("joinError",
                "The maximum number of students has been reached."
            );

            return;
        }

        if (!data) {
            return;
        }

        const name = String(data.name || "").trim();

        const team = String(data.team || "").trim();

        if (!name) {

            socket.emit("joinError",
                "Please enter your name."
            );

            return;
        }

        if (!TEAMS.includes(team)) {

            socket.emit("joinError",
                "Please select a valid team."
            );

            return;
        }

        if (name.length > 40) {

            socket.emit("joinError",
                "Name is too long."
            );

            return;
        }


        // Prevent duplicate names
        const duplicate = getStudents().some(
            student =>
                student.name.toLowerCase() === name.toLowerCase()
        );

        if (duplicate) {

            socket.emit("joinError",
                "This name is already registered."
            );

            return;
        }


        const student = {

            id: socket.id,

            name,

            team

        };


        students.set(socket.id, student);


        socket.emit("joinSuccess", student);


        io.emit("studentsUpdated", {

            students: getStudents(),

            count: students.size,

            minimumStudents

        });


        console.log(
            `${name} joined ${team}`
        );

    });


    // =====================================
    // ADMIN SET MINIMUM
    // =====================================

    socket.on("setMinimum", (number) => {

        const value = Number(number);

        if (!Number.isInteger(value)) {
            return;
        }

        if (value < 1) {
            return;
        }

        if (value > MAX_STUDENTS) {
            return;
        }

        minimumStudents = value;

        io.emit("minimumUpdated", minimumStudents);

        console.log(
            "Minimum students:",
            minimumStudents
        );

    });


    // =====================================
    // ADMIN START GAME
    // =====================================

    socket.on("adminStartGame", () => {

        if (students.size < minimumStudents) {

            socket.emit(
                "adminError",
                `Need ${minimumStudents} students. Currently ${students.size} joined.`
            );

            return;
        }


        gameStarted = true;

        roundNumber++;

        buzzQueue = [];

        currentBuzzIndex = 0;


        io.emit("gameStarted", {

            roundNumber

        });


        console.log(
            `GAME STARTED - Round ${roundNumber}`
        );

    });


    // =====================================
    // STUDENT BUZZ
    // =====================================

    socket.on("buzz", () => {

        if (!gameStarted) {
            return;
        }


        const student = students.get(socket.id);

        if (!student) {
            return;
        }


        // Student cannot buzz twice
        const alreadyBuzzed = buzzQueue.some(
            buzz => buzz.playerId === socket.id
        );

        if (alreadyBuzzed) {
            return;
        }


        // IMPORTANT:
        // The SERVER creates the official position.
        const buzz = {

            position: buzzQueue.length + 1,

            playerId: socket.id,

            name: student.name,

            team: student.team,

            timestamp: Date.now()

        };


        buzzQueue.push(buzz);


        // Send to EVERYONE
        io.emit("buzzReceived", buzz);


        console.log(
            `BUZZ #${buzz.position}: ${buzz.name} - ${buzz.team}`
        );

    });


    // =====================================
    // ADMIN WRONG / NEXT
    // =====================================

    socket.on("adminWrong", () => {

        if (!gameStarted) {
            return;
        }


        if (buzzQueue.length === 0) {
            return;
        }


        currentBuzzIndex++;


        if (currentBuzzIndex >= buzzQueue.length) {

            io.emit("noMorePlayers");

            return;
        }


        const nextPlayer =
            buzzQueue[currentBuzzIndex];


        io.emit("nextPlayer", {

            index: currentBuzzIndex,

            player: nextPlayer

        });


        console.log(
            `NEXT: ${nextPlayer.name} - ${nextPlayer.team}`
        );

    });


    // =====================================
    // ADMIN CORRECT
    // =====================================

    socket.on("adminCorrect", () => {

        if (buzzQueue.length === 0) {
            return;
        }


        const winner =
            buzzQueue[currentBuzzIndex];


        if (!winner) {
            return;
        }


        io.emit("roundWinner", winner);


        console.log(
            `CORRECT: ${winner.name} - ${winner.team}`
        );

    });


    // =====================================
    // RESET ROUND
    // =====================================

    socket.on("adminResetRound", () => {

        if (!gameStarted) {
            return;
        }


        buzzQueue = [];

        currentBuzzIndex = 0;


        io.emit("roundReset");


        console.log(
            "ROUND RESET"
        );

    });


    // =====================================
    // STOP GAME
    // =====================================

    socket.on("adminStopGame", () => {

        // Stop the game
        gameStarted = false;

        // Reset the game session
        roundNumber = 0;

        // Clear all buzzer data
        buzzQueue = [];

        // Reset the current player
        currentBuzzIndex = 0;

        // Tell everyone the game has stopped
        io.emit("gameStopped");

        // Send the completely reset state
        sendFullState();

        console.log(
            "GAME STOPPED - SESSION RESET"
        );

    });


    // =====================================
    // REMOVE STUDENT
    // =====================================

    socket.on("removeStudent", (studentId) => {

        if (!students.has(studentId)) {
            return;
        }


        const student =
            students.get(studentId);


        students.delete(studentId);


        io.emit("studentsUpdated", {

            students: getStudents(),

            count: students.size,

            minimumStudents

        });


        io.emit("studentRemoved", studentId);


        console.log(
            `Removed: ${student.name}`
        );

    });


    // =====================================
    // DISCONNECT
    // =====================================

    socket.on("disconnect", () => {

        const student =
            students.get(socket.id);


        if (student) {

            students.delete(socket.id);


            io.emit("studentsUpdated", {

                students: getStudents(),

                count: students.size,

                minimumStudents

            });


            console.log(
                `Disconnected: ${student.name}`
            );

        }

    });

});


// ===============================
// START SERVER
// ===============================

server.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("==============================");
    console.log(" FIVE TEAM QUIZ BUZZER");
    console.log("==============================");
    console.log(
        `Server running on port ${PORT}`
    );
    console.log("");

});