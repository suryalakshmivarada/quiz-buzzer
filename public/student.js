const socket = io();

let myStudent = null;

let selectedTeam = null;

let hasBuzzed = false;


// Elements

const joinScreen =
    document.getElementById("joinScreen");

const gameScreen =
    document.getElementById("gameScreen");

const studentName =
    document.getElementById("studentName");

const joinButton =
    document.getElementById("joinButton");

const joinError =
    document.getElementById("joinError");

const myName =
    document.getElementById("myName");

const myTeam =
    document.getElementById("myTeam");

const waiting =
    document.getElementById("waiting");

const resultTitle =
    document.getElementById("resultTitle");

const resultPlayer =
    document.getElementById("resultPlayer");

const teamChoices =
    document.querySelectorAll(".teamChoice");

const buzzButton =
    document.getElementById("buzzButton");

// =====================================
// SELECT TEAM
// =====================================

teamChoices.forEach(button => {

    button.addEventListener("click", () => {

        teamChoices.forEach(b => {

            b.classList.remove("selected");

        });


        button.classList.add("selected");


        selectedTeam =
            button.dataset.team;

    });

});


// =====================================
// JOIN
// =====================================

joinButton.addEventListener("click", () => {

    const name =
        studentName.value.trim();


    joinError.textContent = "";


    if (!name) {

        joinError.textContent =
            "Please enter your name.";

        return;

    }


    if (!selectedTeam) {

        joinError.textContent =
            "Please select your team.";

        return;

    }


    socket.emit("joinGame", {

        name,

        team: selectedTeam

    });

});


// =====================================
// JOIN SUCCESS
// =====================================

socket.on("joinSuccess", student => {

    myStudent = student;


    myName.textContent =
        student.name;


    myTeam.textContent =
        student.team;


    joinScreen.classList.add("hidden");

    gameScreen.classList.remove("hidden");


    disableBuzzers();


    waiting.textContent =
        "Waiting for Sir to start the game...";

});


// =====================================
// JOIN ERROR
// =====================================

socket.on("joinError", message => {

    joinError.textContent =
        message;

});


// =====================================
// BUZZ
// =====================================

buzzButton.addEventListener("click", () => {

    if (!myStudent) {
        return;
    }

    if (hasBuzzed) {
        return;
    }

    if (!gameStarted) {
        return;
    }

    socket.emit("buzz");

});




// =====================================
// GAME STATE
// =====================================

let gameStarted = false;


socket.on("fullState", state => {

    gameStarted =
        state.gameStarted;


    if (gameStarted) {

        enableBuzzers();

    }

});


// =====================================
// GAME STARTED
// =====================================

socket.on("gameStarted", data => {

    gameStarted = true;

    hasBuzzed = false;


    enableBuzzers();


    waiting.textContent =
        `ROUND ${data.roundNumber} STARTED`;


    resultTitle.textContent =
        "BUZZ NOW!";


    resultPlayer.textContent =
        "Who will be first?";

});


// =====================================
// BUZZ RECEIVED
// =====================================

socket.on("buzzReceived", buzz => {


    // If this is MY buzz
    if (buzz.playerId === socket.id) {

        hasBuzzed = true;

        disableBuzzers();

    }


    // FIRST
    if (buzz.position === 1) {

        resultTitle.textContent =
            "🥇 FIRST";

        resultPlayer.innerHTML = `
            <strong>${escapeHTML(buzz.name)}</strong>
            <br>
            <span>${escapeHTML(buzz.team)}</span>
        `;

    }

});


// =====================================
// NEXT PLAYER
// =====================================

socket.on("nextPlayer", data => {

    const player =
        data.player;


    resultTitle.textContent =
        `NEXT — #${data.index + 1}`;


    resultPlayer.innerHTML = `
        <strong>${escapeHTML(player.name)}</strong>
        <br>
        <span>${escapeHTML(player.team)}</span>
    `;

});


// =====================================
// CORRECT
// =====================================

socket.on("roundWinner", winner => {

    resultTitle.textContent =
        "✓ CORRECT ANSWER";


    resultPlayer.innerHTML = `
        <strong>${escapeHTML(winner.name)}</strong>
        <br>
        <span>${escapeHTML(winner.team)}</span>
    `;


    disableBuzzers();

});


// =====================================
// NO MORE
// =====================================

socket.on("noMorePlayers", () => {

    resultTitle.textContent =
        "NO MORE BUZZERS";


    resultPlayer.textContent =
        "Nobody else is available.";

    disableBuzzers();

});


// =====================================
// RESET
// =====================================

socket.on("roundReset", () => {

    hasBuzzed = false;


    resultTitle.textContent =
        "NEXT QUESTION";


    resultPlayer.textContent =
        "Waiting for the first buzz...";


    enableBuzzers();

});


// =====================================
// STOP
// =====================================

socket.on("gameStopped", () => {

    gameStarted = false;

    disableBuzzers();


    waiting.textContent =
        "GAME STOPPED BY ADMIN.";

});


// =====================================
// BUTTON CONTROL
// =====================================

function enableBuzzers() {

    buzzButton.disabled = false;

}


function disableBuzzers() {

    buzzButton.disabled = true;

}


// =====================================
// SECURITY
// =====================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}