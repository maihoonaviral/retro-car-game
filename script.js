const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ===============================
// VEHICLE SELECTION
// ===============================

let selectedVehicle = "car";

let gameStarted = false;


const vehicleScreen =
    document.getElementById("vehicleScreen");

const gameScreen =
    document.getElementById("gameScreen");

const vehicleButtons =
    document.querySelectorAll(".vehicle-option");

const startGameBtn =
    document.getElementById("startGameBtn");


vehicleButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        vehicleButtons.forEach(function (btn) {

            btn.classList.remove("selected");

        });


        button.classList.add("selected");


        selectedVehicle =
            button.dataset.vehicle;

    });

});


startGameBtn.addEventListener(
    "click",
    function () {

        gameStarted = true;

        vehicleScreen.style.display = "none";

        gameScreen.style.display = "block";

        restartGame();

    }
);

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const LANES = 5;
const ROAD_X = 42;
const ROAD_WIDTH = 336;
const LANE_WIDTH = ROAD_WIDTH / LANES;

const PLAYER_Y = HEIGHT - 130;

// ===============================
// GAME STATE
// ===============================

let traffic = [];

let running = true;
let gameOver = false;

let lastTime = 0;

let distance = 0;
let bestScore = Number(localStorage.getItem("carGameBest")) || 0;

let level = 1;
let roadOffset = 0;

let spawnTimer = 0;
let gameTime = 0;

let dayNight = 0;


// ===============================
// PLAYER
// ===============================

const player = {

    lane: 2,

    x: 0,
    y: PLAYER_Y,

    width: 42,
    height: 76,

    targetX: 0,

    type: "car",

    body: "#2196f3",

    roof: "#0d47a1"

};

function getLaneX(lane, width) {

    return (
        ROAD_X +
        lane * LANE_WIDTH +
        (LANE_WIDTH - width) / 2
    );

}

player.x = getLaneX(player.lane, player.width);
player.targetX = player.x;


// ===============================
// VEHICLE TYPES
// ===============================

const vehicleTypes = [

    {
        type: "car",
        width: 42,
        height: 76,
        body: "#e74c3c",
        roof: "#8e2929",
        speed: 1
    },

    {
        type: "car",
        width: 40,
        height: 70,
        body: "#eeeeee",
        roof: "#888888",
        speed: 0.95
    },

    {
        type: "car",
        width: 42,
        height: 74,
        body: "#f0c43c",
        roof: "#a88a20",
        speed: 0.9
    },

    {
        type: "car",
        width: 43,
        height: 78,
        body: "#4d86e8",
        roof: "#24549d",
        speed: 1.05
    },

    {
        type: "bike",
        width: 25,
        height: 55,
        body: "#222222",
        roof: "#555555",
        speed: 1.25
    },

    {
        type: "truck",
        width: 54,
        height: 105,
        body: "#cccccc",
        roof: "#666666",
        speed: 0.62
    },

    {
        type: "bus",
        width: 58,
        height: 125,
        body: "#f39c12",
        roof: "#8e5a08",
        speed: 0.55
    },

    {
        type: "tank",
        width: 58,
        height: 82,
        body: "#4b5d3a",
        roof: "#26321f",
        speed: 0.45
    }

];


// ===============================
// RANDOM
// ===============================

function random(min, max) {

    return Math.random() * (max - min) + min;

}


// ===============================
// MOVE PLAYER
// ===============================

function movePlayer(direction) {

    if (gameOver) return;

    player.lane += direction;

    if (player.lane < 0) {
        player.lane = 0;
    }

    if (player.lane >= LANES) {
        player.lane = LANES - 1;
    }

    player.targetX =
        getLaneX(player.lane, player.width);

}


// ===============================
// SPAWN TRAFFIC
// ===============================

function spawnTraffic() {

    let lane = Math.floor(
        Math.random() * LANES
    );

    let attempts = 0;

    while (attempts < 10) {

        let safe = true;

        for (const vehicle of traffic) {

            if (
                vehicle.lane === lane &&
                vehicle.y < 180
            ) {

                safe = false;
                break;

            }

        }

        if (safe) break;

        lane =
            Math.floor(Math.random() * LANES);

        attempts++;

    }


    const type =
        vehicleTypes[
        Math.floor(
            Math.random() * vehicleTypes.length
        )
        ];


    const vehicle = {

        type: type.type,

        lane: lane,

        x: getLaneX(lane, type.width),

        y: -type.height - 20,

        width: type.width,

        height: type.height,

        body: type.body,

        roof: type.roof,

        speed: type.speed

    };


    traffic.push(vehicle);

}


// ===============================
// COLLISION
// ===============================

function checkCollision(a, b) {

    return (

        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y

    );

}


// ===============================
// END GAME
// ===============================

function endGame() {

    gameOver = true;
    running = false;


    if (distance > bestScore) {

        bestScore =
            Math.floor(distance);

        localStorage.setItem(
            "carGameBest",
            bestScore
        );

    }


    document.getElementById(
        "finalScore"
    ).textContent =
        "You travelled " +
        Math.floor(distance) +
        " m";


    document.getElementById(
        "gameOver"
    ).classList.add("show");

}


// ===============================
// DRAW ROAD
// ===============================

function drawRoad() {

    // Grass

    ctx.fillStyle = "#39733b";

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );


    // Road

    ctx.fillStyle = "#444";

    ctx.fillRect(
        ROAD_X,
        0,
        ROAD_WIDTH,
        HEIGHT
    );


    // Road edges

    ctx.fillStyle = "#eeeeee";

    ctx.fillRect(
        ROAD_X,
        0,
        5,
        HEIGHT
    );

    ctx.fillRect(
        ROAD_X + ROAD_WIDTH - 5,
        0,
        5,
        HEIGHT
    );


    // Lane markings

    ctx.fillStyle = "#eeeeee";

    const dashHeight = 40;
    const gap = 35;

    for (
        let lane = 1;
        lane < LANES;
        lane++
    ) {

        const x =
            ROAD_X +
            lane * LANE_WIDTH;

        for (
            let y = -dashHeight;
            y < HEIGHT;
            y += dashHeight + gap
        ) {

            ctx.fillRect(
                x - 2,
                y + roadOffset,
                4,
                dashHeight
            );

        }

    }

}


// ===============================
// DRAW CAR
// ===============================

function drawCar(vehicle) {

    const x = vehicle.x;
    const y = vehicle.y;
    const w = vehicle.width;
    const h = vehicle.height;


    // Body

    ctx.fillStyle = vehicle.body;

    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        w,
        h,
        8
    );

    ctx.fill();


    // Roof

    ctx.fillStyle = vehicle.roof;

    ctx.beginPath();

    ctx.roundRect(
        x + w * 0.16,
        y + h * 0.20,
        w * 0.68,
        h * 0.42,
        6
    );

    ctx.fill();


    // Windows

    ctx.fillStyle = "#18222d";

    ctx.fillRect(
        x + w * 0.22,
        y + h * 0.25,
        w * 0.56,
        h * 0.13
    );

    ctx.fillRect(
        x + w * 0.22,
        y + h * 0.42,
        w * 0.56,
        h * 0.12
    );


    // Wheels

    ctx.fillStyle = "#111";

    ctx.fillRect(
        x - 3,
        y + h * 0.20,
        6,
        h * 0.22
    );

    ctx.fillRect(
        x + w - 3,
        y + h * 0.20,
        6,
        h * 0.22
    );

    ctx.fillRect(
        x - 3,
        y + h * 0.68,
        6,
        h * 0.22
    );

    ctx.fillRect(
        x + w - 3,
        y + h * 0.68,
        6,
        h * 0.22
    );


    // Tail lights

    ctx.fillStyle = "#ff2222";

    ctx.fillRect(
        x + 5,
        y + h - 9,
        8,
        5
    );

    ctx.fillRect(
        x + w - 13,
        y + h - 9,
        8,
        5
    );

}


// ===============================
// DRAW BIKE
// ===============================

function drawBike(vehicle) {

    const x =
        vehicle.x + vehicle.width / 2;

    const y = vehicle.y;

    const h = vehicle.height;


    // Wheels

    ctx.fillStyle = "#111";

    ctx.beginPath();

    ctx.arc(
        x,
        y + 10,
        8,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        x,
        y + h - 10,
        8,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Body

    ctx.strokeStyle = vehicle.body;

    ctx.lineWidth = 6;

    ctx.beginPath();

    ctx.moveTo(
        x,
        y + 15
    );

    ctx.lineTo(
        x - 8,
        y + h / 2
    );

    ctx.lineTo(
        x + 7,
        y + h - 15
    );

    ctx.stroke();


    // Rider

    ctx.fillStyle = "#222";

    ctx.beginPath();

    ctx.arc(
        x,
        y + 22,
        6,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Handle

    ctx.strokeStyle = "#aaa";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(
        x,
        y + 25
    );

    ctx.lineTo(
        x + 10,
        y + 20
    );

    ctx.stroke();

}


// ===============================
// DRAW TRUCK
// ===============================

function drawTruck(vehicle) {

    const x = vehicle.x;
    const y = vehicle.y;
    const w = vehicle.width;
    const h = vehicle.height;


    // Cargo

    ctx.fillStyle = vehicle.body;

    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        w,
        h * 0.65,
        5
    );

    ctx.fill();


    // Cabin

    ctx.fillStyle = vehicle.roof;

    ctx.fillRect(
        x,
        y + h * 0.65,
        w,
        h * 0.35
    );


    // Window

    ctx.fillStyle = "#1d2933";

    ctx.fillRect(
        x + 7,
        y + h * 0.70,
        w - 14,
        h * 0.15
    );


    // Wheels

    ctx.fillStyle = "#111";

    ctx.beginPath();

    ctx.arc(
        x + 10,
        y + h - 5,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
        x + w - 10,
        y + h - 5,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();

}


// ===============================
// DRAW BUS
// ===============================

function drawBus(vehicle) {

    const x = vehicle.x;
    const y = vehicle.y;
    const w = vehicle.width;
    const h = vehicle.height;


    ctx.fillStyle = vehicle.body;

    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        w,
        h,
        8
    );

    ctx.fill();


    // Windows

    ctx.fillStyle = "#182b38";

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        ctx.fillRect(
            x + 7,
            y + 10 + i * 21,
            w - 14,
            13
        );

    }


    // Wheels

    ctx.fillStyle = "#111";

    ctx.beginPath();

    ctx.arc(
        x + 10,
        y + h - 8,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        x + w - 10,
        y + h - 8,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();

}


// ===============================
// DRAW TANK
// ===============================

function drawTank(vehicle) {

    const x = vehicle.x;
    const y = vehicle.y;
    const w = vehicle.width;
    const h = vehicle.height;


    // Tracks

    ctx.fillStyle = "#20251d";

    ctx.fillRect(
        x - 3,
        y,
        9,
        h
    );

    ctx.fillRect(
        x + w - 6,
        y,
        9,
        h
    );


    // Tank body

    ctx.fillStyle = vehicle.body;

    ctx.beginPath();

    ctx.roundRect(
        x + 5,
        y + 15,
        w - 10,
        h - 20,
        8
    );

    ctx.fill();


    // Turret

    ctx.fillStyle = vehicle.roof;

    ctx.beginPath();

    ctx.arc(
        x + w / 2,
        y + h / 2,
        18,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Cannon

    ctx.strokeStyle = "#26321f";

    ctx.lineWidth = 9;

    ctx.beginPath();

    ctx.moveTo(
        x + w / 2,
        y + h / 2
    );

    ctx.lineTo(
        x + w / 2,
        y - 15
    );

    ctx.stroke();

}


// ===============================
// DRAW VEHICLE
// ===============================

function drawVehicle(vehicle) {

    if (vehicle.type === "bike") {

        drawBike(vehicle);

    }

    else if (vehicle.type === "truck") {

        drawTruck(vehicle);

    }

    else if (vehicle.type === "bus") {

        drawBus(vehicle);

    }

    else if (vehicle.type === "tank") {

        drawTank(vehicle);

    }

    else {

        drawCar(vehicle);

    }

}


// ===============================
// UPDATE
// ===============================

function update(dt) {

    if (!running || gameOver) {
        return;
    }


    gameTime += dt;


    // Distance

    const worldSpeed =
        230 +
        Math.min(
            220,
            distance * 0.12
        );


    distance +=
        worldSpeed *
        dt *
        0.035;


    // Level

    level =
        1 +
        Math.floor(
            distance / 1000
        );


    // Road movement

    roadOffset +=
        worldSpeed *
        dt;


    roadOffset %= 75;


    // Player movement

    player.x +=
        (
            player.targetX -
            player.x
        ) *
        Math.min(
            1,
            dt * 12
        );


    // Spawn traffic

    spawnTimer += dt;

    const spawnInterval =
        Math.max(
            0.45,
            1.25 -
            distance / 4000
        );


    if (spawnTimer >= spawnInterval) {

        spawnTimer = 0;

        spawnTraffic();

    }


    // Update traffic

    for (
        let i = traffic.length - 1;
        i >= 0;
        i--
    ) {

        const vehicle =
            traffic[i];


        vehicle.y +=
            worldSpeed *
            vehicle.speed *
            dt;


        // Collision

        if (
            checkCollision(
                player,
                vehicle
            )
        ) {

            endGame();

            return;

        }


        // Remove vehicles

        if (
            vehicle.y >
            HEIGHT + 150
        ) {

            traffic.splice(
                i,
                1
            );

        }

    }


    // HUD

    document.getElementById(
        "distance"
    ).textContent =
        Math.floor(distance) +
        " m";


    document.getElementById(
        "speed"
    ).textContent =
        (
            worldSpeed / 230
        ).toFixed(1) +
        "x";


    document.getElementById(
        "level"
    ).textContent =
        level;


    document.getElementById(
        "best"
    ).textContent =
        Math.floor(bestScore) +
        " m";

}


// ===============================
// DRAW
// ===============================

function draw() {

    ctx.clearRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );


    drawRoad();


    // Traffic

    for (
        const vehicle of traffic
    ) {

        drawVehicle(vehicle);

    }


    // Player

    const playerVehicle = {

        type: player.type,

        x: player.x,

        y: player.y,

        width: player.width,

        height: player.height,

        body: player.body,

        roof: player.roof

    };

    drawVehicle(playerVehicle);
}


// ===============================
// GAME LOOP
// ===============================

function gameLoop(timestamp) {

    if (!lastTime) {
        lastTime = timestamp;
    }


    const dt =
        Math.min(
            (timestamp - lastTime) /
            1000,
            0.05
        );


    lastTime = timestamp;


    update(dt);

    draw();


    requestAnimationFrame(
        gameLoop
    );

}


requestAnimationFrame(
    gameLoop
);


// ===============================
// KEYBOARD
// ===============================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "ArrowLeft" ||
            event.key.toLowerCase() === "a"
        ) {

            movePlayer(-1);

        }


        if (
            event.key === "ArrowRight" ||
            event.key.toLowerCase() === "d"
        ) {

            movePlayer(1);

        }


        if (
            event.key === " "
        ) {

            togglePause();

        }

    }
);


// ===============================
// BUTTONS
// ===============================

document.getElementById(
    "leftBtn"
).addEventListener(
    "click",
    function () {

        movePlayer(-1);

    }
);


document.getElementById(
    "rightBtn"
).addEventListener(
    "click",
    function () {

        movePlayer(1);

    }
);


// ===============================
// PAUSE
// ===============================

function togglePause() {

    if (gameOver) {
        return;
    }


    running = !running;


    document.getElementById(
        "pauseBtn"
    ).textContent =
        running ?
            "PAUSE" :
            "RESUME";


    if (running) {

        lastTime =
            performance.now();

    }

}


document.getElementById(
    "pauseBtn"
).addEventListener(
    "click",
    togglePause
);


// ===============================
// RESTART
// ===============================

function setPlayerVehicle() {

    if (selectedVehicle === "car") {

        player.type = "car";

        player.width = 42;

        player.height = 76;

        player.body = "#2196f3";

        player.roof = "#0d47a1";

    }

    else if (selectedVehicle === "bike") {

        player.type = "bike";

        player.width = 25;

        player.height = 55;

        player.body = "#2196f3";

        player.roof = "#0d47a1";

    }

    else if (selectedVehicle === "truck") {

        player.type = "truck";

        player.width = 54;

        player.height = 105;

        player.body = "#2196f3";

        player.roof = "#0d47a1";

    }

    else if (selectedVehicle === "bus") {

        player.type = "bus";

        player.width = 58;

        player.height = 125;

        player.body = "#2196f3";

        player.roof = "#0d47a1";

    }

    else if (selectedVehicle === "tank") {

        player.type = "tank";

        player.width = 58;

        player.height = 82;

        player.body = "#4b8b3b";

        player.roof = "#26321f";

    }


    player.x =
        getLaneX(
            player.lane,
            player.width
        );

    player.targetX =
        player.x;

}

function restartGame() {

    traffic = [];

    distance = 0;

    level = 1;

    roadOffset = 0;

    spawnTimer = 0;

    gameTime = 0;

    gameOver = false;

    running = true;


    player.lane = 2;

    setPlayerVehicle();

    player.x =
        getLaneX(
            player.lane,
            player.width
        );

    player.targetX =
        player.x;


    document.getElementById(
        "gameOver"
    ).classList.remove(
        "show"
    );


    document.getElementById(
        "pauseBtn"
    ).textContent =
        "PAUSE";


    lastTime =
        performance.now();

}


document.getElementById(
    "restartBtn"
).addEventListener(
    "click",

    restartGame
);

document.getElementById(
    "changeVehicleBtn"
).addEventListener(
    "click",
    function () {

        gameScreen.style.display = "none";

        vehicleScreen.style.display = "flex";

        gameOver = false;

        running = false;

    }
);
