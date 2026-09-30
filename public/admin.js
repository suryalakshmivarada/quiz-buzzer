const socket = io();


// =====================================
// ELEMENTS
// =====================================

const studentCount =
    document.getElementById("studentCount");

const joinStatus =
    document.getElementById("joinStatus");

const minimumInput =
    document.getElementById("minimumInput");

const saveMinimum =
    document.getElementById("saveMinimum");

const teamCounts =
    document.getElementById("teamCounts");

const startGame =
    document.getElementById("startGame");

const resetRound =
    document.getElementById("resetRound");

const correct =
    document.getElementById("correct");

const wrong =
    document.getElementById("wrong");

const stopGame =
    document.getElementById("stopGame");

const adminMessage =
    document.getElementById("adminMessage");

const currentTitle =
    document.getElementById("currentTitle");

const currentPlayer =
    document.getElementById("currentPlayer");

const buzzQueue =
    document.getElementById("buzzQueue");

const studentsList =
    document.getElementById("studentsList");


let currentStudents = [];

let currentMinimum = 80;


// =====================================
// FULL STATE
// =====================================

socket.on("fullState", state => {

    currentStudents =
        state.students;

    currentMinimum =
        state.minimumStudents;


    minimumInput.value =
        state.minimumStudents;


    updateStudentDisplay();

    renderTeamCounts();

    renderBuzzQueue(
        state.buzzQueue
    );

});


// =====================================
// STUDENTS UPDATED
// =====================================

socket.on("studentsUpdated", data => {

    currentStudents =
        data.students;

    currentMinimum =
        data.minimumStudents;


    minimumInput.value =
        currentMinimum;


    updateStudentDisplay();

    renderTeamCounts();

});


// =====================================
// SAVE MINIMUM
// =====================================

saveMinimum.addEventListener(
    "click",
    () => {

        const value =
            Number(minimumInput.value);


        if (!value) {
            return;
        }


        socket.emit(
            "setMinimum",
            value
        );

    }
);


// =====================================
// MINIMUM UPDATED
// =====================================

socket.on("minimumUpdated", value => {

    currentMinimum = value;

    minimumInput.value = value;

    updateStudentDisplay();

});


// =====================================
// START GAME
// =====================================

startGame.addEventListener(
    "click",
    () => {

        socket.emit(
            "adminStartGame"
        );

    }
);


// =====================================
// RESET
// =====================================

resetRound.addEventListener(
    "click",
    () => {

        socket.emit(
            "adminResetRound"
        );

    }
);


// =====================================
// CORRECT
// =====================================

correct.addEventListener(
    "click",
    () => {

        socket.emit(
            "adminCorrect"
        );

    }
);


// =====================================
// WRONG
// =====================================

wrong.addEventListener(
    "click",
    () => {

        socket.emit(
            "adminWrong"
        );

    }
);


// =====================================
// STOP
// =====================================

stopGame.addEventListener(
    "click",
    () => {

        socket.emit(
            "adminStopGame"
        );

    }
);


// =====================================
// ADMIN ERROR
// =====================================

socket.on("adminError", message => {

    showMessage(message);

});


// =====================================
// GAME STARTED
// =====================================

socket.on("gameStarted", data => {

    showMessage(
        `Round ${data.roundNumber} started.`
    );


    currentTitle.textContent =
        "WAITING FOR BUZZ";


    currentPlayer.textContent =
        "Nobody has buzzed yet.";


    buzzQueue.innerHTML = "";

});


// =====================================
// BUZZ
// =====================================

socket.on("buzzReceived", buzz => {

    addBuzz(buzz);


    if (buzz.position === 1) {

        showCurrentPlayer(buzz);

    }

});


// =====================================
// NEXT PLAYER
// =====================================

socket.on("nextPlayer", data => {

    showCurrentPlayer(
        data.player
    );

});


// =====================================
// CORRECT
// =====================================

socket.on("roundWinner", winner => {

    currentTitle.textContent =
        "✓ CORRECT ANSWER";


    currentPlayer.innerHTML = `
        <strong>
            ${escapeHTML(winner.name)}
        </strong>

        <br>

        TEAM:
        ${escapeHTML(winner.team)}
    `;

});


// =====================================
// NO MORE
// =====================================

socket.on("noMorePlayers", () => {

    currentTitle.textContent =
        "NO MORE PLAYERS";


    currentPlayer.textContent =
        "Everyone in the backup queue has been used.";

});


// =====================================
// RESET
// =====================================

socket.on("roundReset", () => {

    currentTitle.textContent =
        "NEW QUESTION";


    currentPlayer.textContent =
        "Waiting for first buzz...";


    buzzQueue.innerHTML = "";

});


// =====================================
// STOP
// =====================================

socket.on("gameStopped", () => {

    currentTitle.textContent =
        "GAME STOPPED";


    currentPlayer.textContent =
        "Press START GAME when ready.";

});


// =====================================
// DISPLAY STUDENTS
// =====================================

function updateStudentDisplay() {

    const count =
        currentStudents.length;


    studentCount.textContent =
        `${count} / ${currentMinimum}`;


    if (count >= currentMinimum) {

        joinStatus.textContent =
            "✓ Minimum reached — GAME CAN START";

        joinStatus.className =
            "ready";

    } else {

        joinStatus.textContent =
            `Need ${currentMinimum - count} more student(s).`;

        joinStatus.className =
            "";

    }


    studentsList.innerHTML = "";


    currentStudents.forEach(student => {

        const div =
            document.createElement("div");


        div.className =
            "studentRow";


        div.innerHTML = `

            <span>
                <strong>
                    ${escapeHTML(student.name)}
                </strong>

                —
                ${escapeHTML(student.team)}
            </span>

            <button
                onclick="removeStudent('${student.id}')"
            >
                REMOVE
            </button>

        `;


        studentsList.appendChild(div);

    });

}


// =====================================
// TEAM COUNTS
// =====================================

function renderTeamCounts() {

    const teams = {

        Agni: 0,

        Vayu: 0,

        Akash: 0,

        Jal: 0,

        Prudhvi: 0

    };


    currentStudents.forEach(student => {

        if (teams[student.team] !== undefined) {

            teams[student.team]++;

        }

    });


    teamCounts.innerHTML = `

        <div>🔥 AGNI <strong>${teams.Agni}</strong></div>

        <div>💨 VAYU <strong>${teams.Vayu}</strong></div>

        <div>☁️ AKASH <strong>${teams.Akash}</strong></div>

        <div>💧 JAL <strong>${teams.Jal}</strong></div>

        <div>🌍 PRUDHVI <strong>${teams.Prudhvi}</strong></div>

    `;

}


// =====================================
// ADD BUZZ
// =====================================

function addBuzz(buzz) {

    const div =
        document.createElement("div");


    div.className =
        "queueItem";


    div.dataset.playerId =
        buzz.playerId;


    div.innerHTML = `

        <span class="queueNumber">
            #${buzz.position}
        </span>

        <span>
            <strong>
                ${escapeHTML(buzz.name)}
            </strong>

            <br>

            ${escapeHTML(buzz.team)}
        </span>

    `;


    buzzQueue.appendChild(div);

}


// =====================================
// RENDER QUEUE
// =====================================

function renderBuzzQueue(queue) {

    buzzQueue.innerHTML = "";


    queue.forEach(buzz => {

        addBuzz(buzz);

    });

}


// =====================================
// CURRENT PLAYER
// =====================================

function showCurrentPlayer(player) {

    currentTitle.textContent =
        `POSITION #${player.position}`;


    currentPlayer.innerHTML = `

        <strong>
            ${escapeHTML(player.name)}
        </strong>

        <br>

        TEAM:
        ${escapeHTML(player.team)}

    `;

}


// =====================================
// REMOVE STUDENT
// =====================================

window.removeStudent = function (id) {

    socket.emit(
        "removeStudent",
        id
    );

};


// =====================================
// MESSAGE
// =====================================

function showMessage(message) {

    adminMessage.textContent =
        message;


    setTimeout(() => {

        adminMessage.textContent = "";

    }, 5000);

}


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}