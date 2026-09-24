const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;


/* =========================================================
   ROAD
========================================================= */

const LANES = 5;

const ROAD_X = 42;
const ROAD_WIDTH = 336;

const LANE_WIDTH = ROAD_WIDTH / LANES;


/* =========================================================
   TRAFFIC AI SETTINGS
========================================================= */

const HALF_ROAD = HEIGHT / 2;

const LANE_CHANGE_TIME = 0.45;

const FRONT_SAFE_DISTANCE = 110;

const BACK_SAFE_DISTANCE = 90;

const LANE_CHANGE_SAFE_DISTANCE = 125;


/* =========================================================
   PLAYER
========================================================= */

const player = {

    lane: 2,

    width: 42,
    height: 76,

    x: 0,
    y: HEIGHT - 130,

    targetX: 0,

    shield: false,

    boost: 0,

    invincible: 0

};


/* =========================================================
   GAME STATE
========================================================= */

let traffic = [];

let coins = [];

let particles = [];

let running = true;

let gameOver = false;

let lastTime = performance.now();

let spawnTimer = 0;

let coinTimer = 2;

let distance = 0;

let bestScore = 0;

let coinScore = 0;

let roadOffset = 0;

let level = 1;

let gameTime = 0;

let dayNight = 0;

let soundEnabled = true;


/* =========================================================
   BEST SCORE
========================================================= */

try {

    bestScore =
        Number(
            localStorage.getItem("carGameBest")
        ) || 0;

} catch (error) {

    bestScore = 0;

}


document.getElementById("best").textContent =
    Math.floor(bestScore) + " m";


/* =========================================================
   VEHICLE TYPES
========================================================= */

const vehicleTypes = [

    {
        type: "car",

        width: 40,
        height: 70,

        body: "#eeeeee",
        roof: "#999999",

        speed: 0.90
    },

    {
        type: "car",

        width: 42,
        height: 76,

        body: "#e74c3c",
        roof: "#8e2929",

        speed: 1.00
    },

    {
        type: "car",

        width: 42,
        height: 74,

        body: "#f0c43c",
        roof: "#a88a20",

        speed: 0.85
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
        type: "suv",

        width: 47,
        height: 82,

        body: "#444444",
        roof: "#222222",

        speed: 0.90
    },

    {
        type: "van",

        width: 48,
        height: 88,

        body: "#eeeeee",
        roof: "#888888",

        speed: 0.72
    },

    {
        type: "truck",

        width: 54,
        height: 108,

        body: "#cccccc",
        roof: "#666666",

        speed: 0.58
    }

];


/* =========================================================
   PLAYER POSITION
========================================================= */

function getLaneX(lane, width) {

    return (
        ROAD_X +
        lane * LANE_WIDTH +
        LANE_WIDTH / 2 -
        width / 2
    );

}


player.x =
    getLaneX(
        player.lane,
        player.width
    );

player.targetX =
    player.x;


/* =========================================================
   RANDOM
========================================================= */

function random(min, max) {

    return (
        min +
        Math.random() *
        (max - min)
    );

}


/* =========================================================
   PLAYER LANE CHANGE
========================================================= */

function movePlayer(direction) {

    if (gameOver)
        return;

    player.lane += direction;

    player.lane =
        Math.max(
            0,
            Math.min(
                LANES - 1,
                player.lane
            )
        );

    player.targetX =
        getLaneX(
            player.lane,
            player.width
        );

}


/* =========================================================
   CHECK IF LANE IS SAFE
========================================================= */

function isLaneSafe(
    lane,
    y,
    width,
    height,
    ignoreVehicle = null
) {

    for (const car of traffic) {

        if (car === ignoreVehicle) {
            continue;
        }

        /*
           During a lane change, also consider
           the vehicle's target lane.
        */

        const carLane =
            car.laneChanging
                ? car.targetLane
                : car.lane;

        if (carLane !== lane) {
            continue;
        }

        const myCenter =
            y + height / 2;

        const otherCenter =
            car.y + car.height / 2;

        const verticalGap =
            Math.abs(
                myCenter -
                otherCenter
            );

        if (
            verticalGap <
            LANE_CHANGE_SAFE_DISTANCE +
            Math.max(
                height,
                car.height
            ) / 2
        ) {

            return false;

        }

    }

    return true;

}


/* =========================================================
   FIND SAFE LANE
========================================================= */

function findSafeLane(car) {

    const possibleLanes = [];

    const directions = [-1, 1];

    for (const direction of directions) {

        const targetLane =
            car.lane + direction;

        /*
           Don't leave the road.
        */

        if (
            targetLane < 0 ||
            targetLane >= LANES
        ) {

            continue;

        }


        /*
           Basic safety check.
        */

        if (
            !isLaneSafe(
                targetLane,
                car.y,
                car.width,
                car.height,
                car
            )
        ) {

            continue;

        }


        /*
           Check vehicle in front.
        */

        let frontSafe = true;

        for (const other of traffic) {

            if (other === car) {
                continue;
            }

            const otherLane =
                other.laneChanging
                    ? other.targetLane
                    : other.lane;

            if (
                otherLane !== targetLane
            ) {

                continue;

            }

            if (
                other.y < car.y
            ) {

                const gap =
                    car.y -
                    (
                        other.y +
                        other.height
                    );

                if (
                    gap <
                    FRONT_SAFE_DISTANCE
                ) {

                    frontSafe = false;

                    break;

                }

            }

        }


        if (!frontSafe) {
            continue;
        }


        /*
           Check vehicle behind.
        */

        let backSafe = true;

        for (const other of traffic) {

            if (other === car) {
                continue;
            }

            const otherLane =
                other.laneChanging
                    ? other.targetLane
                    : other.lane;

            if (
                otherLane !== targetLane
            ) {

                continue;

            }

            if (
                other.y > car.y
            ) {

                const gap =
                    other.y -
                    (
                        car.y +
                        car.height
                    );

                if (
                    gap <
                    BACK_SAFE_DISTANCE
                ) {

                    backSafe = false;

                    break;

                }

            }

        }


        if (!backSafe) {
            continue;
        }


        possibleLanes.push(
            targetLane
        );

    }


    if (
        possibleLanes.length === 0
    ) {

        return null;

    }


    return possibleLanes[
        Math.floor(
            Math.random() *
            possibleLanes.length
        )
    ];

}


/* =========================================================
   VEHICLE AHEAD
========================================================= */

function vehicleAhead(
    car,
    lane = car.lane
) {

    let closest = null;

    let smallestGap = Infinity;


    for (const other of traffic) {

        if (other === car) {
            continue;
        }


        const otherLane =
            other.laneChanging
                ? other.targetLane
                : other.lane;


        if (
            otherLane !== lane
        ) {

            continue;

        }


        /*
           Only vehicles ahead.
        */

        if (
            other.y < car.y
        ) {

            const gap =
                car.y -
                (
                    other.y +
                    other.height
                );


            if (
                gap >= 0 &&
                gap < smallestGap
            ) {

                smallestGap =
                    gap;

                closest =
                    other;

            }

        }

    }


    return closest;

}


/* =========================================================
   GET TARGET SPEED
========================================================= */

function getTargetSpeed(
    car,
    lane = car.lane
) {

    /*
       Start with normal speed.
    */

    let targetSpeed =
        car.baseSpeed;


    /*
       Find vehicle ahead.
    */

    const frontCar =
        vehicleAhead(
            car,
            lane
        );


    if (frontCar) {

        const gap =
            car.y -
            (
                frontCar.y +
                frontCar.height
            );


        /*
           Very close.
        */

        if (
            gap < 45
        ) {

            targetSpeed =
                frontCar.currentSpeed *
                0.72;

        }


        /*
           Getting close.
        */

        else if (
            gap < 100
        ) {

            targetSpeed =
                frontCar.currentSpeed *
                0.88;

        }


        /*
           Following normally.
        */

        else if (
            gap < 180
        ) {

            targetSpeed =
                frontCar.currentSpeed;

        }

    }


    /*
       Never completely stop.
    */

    return Math.max(
        0.35,
        targetSpeed
    );

}


/* =========================================================
   SPAWN TRAFFIC
========================================================= */

function spawnTraffic() {

    const availableLanes = [];


    /*
       Find safe spawn lanes.
    */

    for (
        let lane = 0;
        lane < LANES;
        lane++
    ) {

        let safe = true;


        for (
            const car of traffic
        ) {

            const carLane =
                car.laneChanging
                    ? car.targetLane
                    : car.lane;


            if (
                carLane === lane &&
                car.y < 180
            ) {

                safe = false;

                break;

            }

        }


        if (safe) {

            availableLanes.push(
                lane
            );

        }

    }


    if (
        availableLanes.length === 0
    ) {

        return;

    }


    /*
       Random lane.
    */

    const lane =
        availableLanes[
        Math.floor(
            Math.random() *
            availableLanes.length
        )
        ];


    /*
       Random vehicle type.
    */

    const vehicle =
        vehicleTypes[
        Math.floor(
            Math.random() *
            vehicleTypes.length
        )
        ];


    traffic.push({

        lane: lane,

        targetLane: lane,

        x:
            getLaneX(
                lane,
                vehicle.width
            ),

        y:
            -150 -
            random(
                0,
                100
            ),

        width:
            vehicle.width,

        height:
            vehicle.height,

        body:
            vehicle.body,

        roof:
            vehicle.roof,

        baseSpeed:
            vehicle.speed,

        /*
           Current speed changes
           according to traffic.
        */

        currentSpeed:
            vehicle.speed,

        /*
           Each vehicle gets
           exactly ONE lane change.
        */

        hasChangedLane:
            false,

        laneChanging:
            false,

        laneChangeProgress:
            0,

        laneChangeTimer:
            random(
                2.5,
                5
            )

    });

}


/* =========================================================
   TRAFFIC COLLISION
========================================================= */

function trafficCollision(a, b) {

    const padding = 7;


    return (

        a.x + padding <
        b.x +
        b.width -
        padding

        &&

        a.x +
        a.width -
        padding >
        b.x +
        padding

        &&

        a.y + padding <
        b.y +
        b.height -
        padding

        &&

        a.y +
        a.height -
        padding >
        b.y +
        padding

    );

}


/* =========================================================
   PREVENT TRAFFIC OVERLAP
========================================================= */

function preventTrafficCollisions(car) {

    for (
        const other of traffic
    ) {

        if (
            car === other
        ) {

            continue;

        }


        if (
            trafficCollision(
                car,
                other
            )
        ) {

            /*
               If this car is behind
               the other car, place it
               behind with a small gap.
            */

            if (
                car.y > other.y
            ) {

                car.y =
                    other.y +
                    other.height +
                    8;

            }

        }

    }

}


/* =========================================================
   DRAW ROAD
========================================================= */

function drawRoad() {

    const cycle =
        Math.sin(
            dayNight
        );


    let grassColor =
        "#6f9d62";


    if (
        cycle < -0.35
    ) {

        grassColor =
            "#263c28";

    }


    /*
       Grass
    */

    ctx.fillStyle =
        grassColor;

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );


    /*
       Road
    */

    ctx.fillStyle =
        cycle < -0.35
            ? "#4d4d4d"
            : "#777";


    ctx.fillRect(
        ROAD_X,
        0,
        ROAD_WIDTH,
        HEIGHT
    );


    /*
       Road shoulders
    */

    ctx.fillStyle =
        "#d5d5d5";


    ctx.fillRect(
        ROAD_X - 10,
        0,
        10,
        HEIGHT
    );


    ctx.fillRect(
        ROAD_X + ROAD_WIDTH,
        0,
        10,
        HEIGHT
    );


    /*
       Lane lines
    */

    for (
        let lane = 1;
        lane < LANES;
        lane++
    ) {

        const x =
            ROAD_X +
            lane *
            LANE_WIDTH;


        for (
            let y =
                -80 +
                roadOffset % 80;

            y < HEIGHT;

            y += 80
        ) {

            ctx.fillStyle =
                "#eeeeee";


            ctx.fillRect(
                x - 2,
                y,
                4,
                40
            );

        }

    }


    /*
       Road borders
    */

    ctx.fillStyle =
        "#555";


    ctx.fillRect(
        ROAD_X,
        0,
        4,
        HEIGHT
    );


    ctx.fillRect(
        ROAD_X +
        ROAD_WIDTH -
        4,

        0,

        4,

        HEIGHT
    );

}


/* =========================================================
   DRAW VEHICLE
========================================================= */

function drawVehicle(
    vehicle,
    isPlayer = false
) {

    ctx.save();


    ctx.translate(
        vehicle.x,
        vehicle.y
    );


    /*
       Shadow
    */

    ctx.fillStyle =
        "rgba(0,0,0,0.3)";


    ctx.fillRect(
        4,
        6,
        vehicle.width,
        vehicle.height
    );


    /*
       Body
    */

    ctx.fillStyle =
        vehicle.body;


    ctx.beginPath();


    ctx.roundRect(
        0,
        0,
        vehicle.width,
        vehicle.height,
        7
    );


    ctx.fill();


    /*
       Roof
    */

    ctx.fillStyle =
        vehicle.roof;


    ctx.beginPath();


    ctx.roundRect(
        vehicle.width * 0.15,

        vehicle.height * 0.18,

        vehicle.width * 0.7,

        vehicle.height * 0.4,

        5
    );


    ctx.fill();


    /*
       Windows
    */

    ctx.fillStyle =
        "#b7dce9";


    ctx.beginPath();


    ctx.roundRect(
        vehicle.width * 0.22,

        vehicle.height * 0.22,

        vehicle.width * 0.56,

        vehicle.height * 0.13,

        3
    );


    ctx.fill();


    ctx.fillStyle =
        "#8fb9c9";


    ctx.beginPath();


    ctx.roundRect(
        vehicle.width * 0.22,

        vehicle.height * 0.39,

        vehicle.width * 0.56,

        vehicle.height * 0.14,

        3
    );


    ctx.fill();


    /*
       Wheels
    */

    ctx.fillStyle =
        "#181818";


    ctx.fillRect(
        -2,
        12,
        5,
        17
    );


    ctx.fillRect(
        vehicle.width - 3,
        12,
        5,
        17
    );


    ctx.fillRect(
        -2,
        vehicle.height - 29,
        5,
        17
    );


    ctx.fillRect(
        vehicle.width - 3,
        vehicle.height - 29,
        5,
        17
    );


    /*
       Tail lights
    */

    ctx.fillStyle =
        "#ff3030";


    ctx.fillRect(
        7,
        vehicle.height - 7,
        8,
        4
    );


    ctx.fillRect(
        vehicle.width - 15,
        vehicle.height - 7,
        8,
        4
    );


    /*
       Player outline
    */

    if (isPlayer) {

        ctx.strokeStyle =
            "#ffffff";

        ctx.lineWidth = 2;


        ctx.strokeRect(
            1,
            1,
            vehicle.width - 2,
            vehicle.height - 2
        );

    }


    ctx.restore();

}


/* =========================================================
   COINS
========================================================= */

function spawnCoin() {

    const lane =
        Math.floor(
            Math.random() *
            LANES
        );


    coins.push({

        lane: lane,

        x:
            getLaneX(
                lane,
                24
            ) + 12,

        y: -30,

        radius: 10

    });

}


function drawCoin(coin) {

    ctx.beginPath();


    ctx.arc(
        coin.x,
        coin.y,
        coin.radius,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#ffd700";


    ctx.fill();


    ctx.strokeStyle =
        "#fff1a8";


    ctx.lineWidth = 2;

    ctx.stroke();


    ctx.fillStyle =
        "#9c7400";


    ctx.font =
        "bold 11px Arial";


    ctx.textAlign =
        "center";


    ctx.fillText(
        "$",
        coin.x,
        coin.y + 4
    );

}


/* =========================================================
   COLLECT COINS
========================================================= */

function collectCoins() {

    for (
        let i = coins.length - 1;
        i >= 0;
        i--
    ) {

        const coin =
            coins[i];


        if (

            Math.abs(
                player.x +
                player.width / 2 -
                coin.x
            ) < 30

            &&

            Math.abs(
                player.y +
                player.height / 2 -
                coin.y
            ) < 50

        ) {

            coinScore++;


            coins.splice(
                i,
                1
            );


            createParticles(
                coin.x,
                coin.y,
                "#ffd700"
            );


            playCoinSound();

        }

    }

}


/* =========================================================
   PARTICLES
========================================================= */

function createParticles(
    x,
    y,
    color
) {

    for (
        let i = 0;
        i < 10;
        i++
    ) {

        particles.push({

            x: x,

            y: y,

            vx:
                random(
                    -100,
                    100
                ),

            vy:
                random(
                    -100,
                    50
                ),

            life: 0.5,

            color: color

        });

    }

}


function updateParticles(dt) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            particles[i];


        p.x +=
            p.vx * dt;


        p.y +=
            p.vy * dt;


        p.life -=
            dt;


        if (
            p.life <= 0
        ) {

            particles.splice(
                i,
                1
            );

        }

    }

}


function drawParticles() {

    for (
        const p of particles
    ) {

        ctx.globalAlpha =
            Math.max(
                0,
                p.life * 2
            );


        ctx.fillStyle =
            p.color;


        ctx.fillRect(
            p.x,
            p.y,
            4,
            4
        );

    }


    ctx.globalAlpha = 1;

}


/* =========================================================
   UPDATE
========================================================= */

function update(deltaTime) {

    if (
        !running ||
        gameOver
    ) {

        return;

    }


    gameTime +=
        deltaTime;


    /*
       Difficulty
    */

    const difficulty =
        1 +
        distance / 1600;


    /*
       World speed
    */

    const worldSpeed =
        235 +
        Math.min(
            230,
            distance * 0.11
        );


    /*
       Level
    */

    level =
        1 +
        Math.floor(
            distance / 500
        );


    /*
       Day/night
    */

    dayNight +=
        deltaTime * 0.015;


    /*
       Road animation
    */

    roadOffset +=
        worldSpeed *
        deltaTime;


    /*
       Distance
    */

    distance +=
        worldSpeed *
        deltaTime *
        0.035;


    /*
       Player smooth movement
    */

    player.x +=
        (
            player.targetX -
            player.x
        ) *
        Math.min(
            1,
            deltaTime * 13
        );


    /* =====================================================
       TRAFFIC SPAWN
    ===================================================== */

    spawnTimer -=
        deltaTime;


    const spawnInterval =
        Math.max(
            0.40,
            1.25 -
            distance / 3800
        );


    if (
        spawnTimer <= 0
    ) {

        spawnTraffic();


        /*
           Extra traffic at higher levels.
        */

        if (
            level >= 3 &&
            Math.random() <
            Math.min(
                0.35,
                distance / 5000
            )
        ) {

            spawnTraffic();

        }


        spawnTimer =
            spawnInterval *
            random(
                0.75,
                1.15
            );

    }


    /* =====================================================
       COIN SPAWN
    ===================================================== */

    coinTimer -=
        deltaTime;


    if (
        coinTimer <= 0
    ) {

        spawnCoin();


        coinTimer =
            random(
                1.5,
                3.5
            );

    }


    /* =====================================================
       UPDATE TRAFFIC
    ===================================================== */

    for (
        let i = traffic.length - 1;
        i >= 0;
        i--
    ) {

        const car =
            traffic[i];


        /* =================================================
           LANE CHANGE TIMER
        ================================================= */

        car.laneChangeTimer -=
            deltaTime;


        /* =================================================
           CAN START LANE CHANGE?
        ================================================= */

        /*
           Front half of the road.
        */

        const inFrontHalf =
            car.y + car.height <
            HALF_ROAD;


        /*
           Estimate where the car will be
           after completing the lane change.
        */

        const predictedY =
            car.y +
            worldSpeed *
            car.currentSpeed *
            LANE_CHANGE_TIME *
            0.72;


        const predictedBottom =
            predictedY +
            car.height;


        /*
           The lane change must finish
           before the halfway point.
        */

        const canFinishBeforeHalf =
            predictedBottom <
            HALF_ROAD;


        /*
           A vehicle can change lane
           ONLY ONCE.
        */

        if (

            !car.hasChangedLane &&

            !car.laneChanging &&

            car.laneChangeTimer <= 0 &&

            inFrontHalf &&

            canFinishBeforeHalf &&

            Math.random() <
            Math.min(
                0.55,
                0.10 +
                distance / 7000
            )

        ) {

            const safeLane =
                findSafeLane(car);


            if (
                safeLane !== null
            ) {

                car.targetLane =
                    safeLane;


                car.laneChanging =
                    true;


                car.hasChangedLane =
                    true;


                car.laneChangeProgress =
                    0;

            }

        }


        /* =================================================
           ACTUAL LANE CHANGE
        ================================================= */

        if (
            car.laneChanging
        ) {

            /*
               Progress of lane change.
            */

            car.laneChangeProgress +=
                deltaTime /
                LANE_CHANGE_TIME;


            const progress =
                Math.min(
                    1,
                    car.laneChangeProgress
                );


            /*
               Smoothstep easing.
            */

            const eased =
                progress *
                progress *
                (3 - 2 * progress);


            const startX =
                getLaneX(
                    car.lane,
                    car.width
                );


            const targetX =
                getLaneX(
                    car.targetLane,
                    car.width
                );


            car.x =
                startX +
                (
                    targetX -
                    startX
                ) *
                eased;


            /*
               If halfway is reached,
               don't allow the lane change
               to continue beyond it.
            */

            if (
                car.y + car.height >=
                HALF_ROAD
            ) {

                /*
                   If almost finished,
                   complete the lane change.
                */

                if (
                    progress >= 0.85
                ) {

                    car.x =
                        targetX;

                    car.lane =
                        car.targetLane;

                }

                else {

                    /*
                       Otherwise keep the car
                       in its original lane.
                    */

                    car.x =
                        getLaneX(
                            car.lane,
                            car.width
                        );

                }

                car.laneChanging =
                    false;

            }

            else if (
                progress >= 1
            ) {

                car.x =
                    targetX;


                car.lane =
                    car.targetLane;


                car.laneChanging =
                    false;

            }

        }


        /* =================================================
           TRAFFIC SPEED AI
        ================================================= */

        /*
           Which lane should be checked?

           If changing lane, look at the
           target lane.
        */

        const speedLane =
            car.laneChanging
                ? car.targetLane
                : car.lane;


        /*
           Calculate desired speed.
        */

        const targetSpeed =
            getTargetSpeed(
                car,
                speedLane
            );


        /*
           Smooth acceleration/deceleration.
        */

        car.currentSpeed +=
            (
                targetSpeed -
                car.currentSpeed
            ) *
            Math.min(
                1,
                deltaTime * 3
            );


        /* =================================================
           EXTRA EMERGENCY BRAKING
        ================================================= */

        const frontCar =
            vehicleAhead(
                car,
                speedLane
            );


        if (
            frontCar
        ) {

            const gap =
                car.y -
                (
                    frontCar.y +
                    frontCar.height
                );


            /*
               Very small gap.
            */

            if (
                gap < 35
            ) {

                car.currentSpeed =
                    Math.min(
                        car.currentSpeed,
                        frontCar.currentSpeed *
                        0.60
                    );

            }

        }


        /* =================================================
           MOVE TRAFFIC
        ================================================= */

        car.y +=

            worldSpeed *

            car.currentSpeed *

            deltaTime *

            difficulty *

            0.72;


        /* =================================================
           EXTRA COLLISION PROTECTION
        ================================================= */

        preventTrafficCollisions(
            car
        );


        /* =================================================
           REMOVE TRAFFIC
        ================================================= */

        if (
            car.y >
            HEIGHT + 160
        ) {

            traffic.splice(
                i,
                1
            );

            continue;

        }


        /* =================================================
           PLAYER COLLISION
        ================================================= */

        if (
            trafficCollision(
                player,
                car
            )
        ) {

            if (
                player.shield
            ) {

                player.shield =
                    false;


                createParticles(
                    player.x +
                    player.width / 2,

                    player.y +
                    player.height / 2,

                    "#42a5ff"
                );


                traffic.splice(
                    i,
                    1
                );


                continue;

            }


            endGame();

            return;

        }

    }


    /* =====================================================
       UPDATE COINS
    ===================================================== */

    for (
        let i = coins.length - 1;
        i >= 0;
        i--
    ) {

        const coin =
            coins[i];


        coin.y +=
            worldSpeed *
            deltaTime;


        if (
            coin.y >
            HEIGHT + 30
        ) {

            coins.splice(
                i,
                1
            );

        }

    }


    collectCoins();


    updateParticles(
        deltaTime
    );


    /* =====================================================
       HUD
    ===================================================== */

    document.getElementById(
        "distance"
    ).textContent =
        Math.floor(distance) +
        " m";


    document.getElementById(
        "speed"
    ).textContent =
        (
            1 +
            Math.min(
                2,
                distance / 1800
            )
        ).toFixed(1) +
        "x";


    document.getElementById(
        "level"
    ).textContent =
        level;

}


/* =========================================================
   DRAW
========================================================= */

function draw() {

    ctx.clearRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );


    drawRoad();


    /*
       Coins
    */

    for (
        const coin of coins
    ) {

        drawCoin(coin);

    }


    /*
       Traffic
    */

    traffic
        .sort(
            (a, b) =>
                a.y - b.y
        )
        .forEach(
            car =>
                drawVehicle(car)
        );


    /*
       Player
    */

    drawVehicle(

        {

            x:
                player.x,

            y:
                player.y,

            width:
                player.width,

            height:
                player.height,

            body:
                "#4285ff",

            roof:
                "#24549d"

        },

        true

    );


    /*
       Shield
    */

    if (
        player.shield
    ) {

        ctx.beginPath();


        ctx.arc(

            player.x +
            player.width / 2,

            player.y +
            player.height / 2,

            52,

            0,

            Math.PI * 2

        );


        ctx.strokeStyle =
            "#42a5ff";


        ctx.lineWidth = 3;

        ctx.stroke();

    }


    drawParticles();

}


/* =========================================================
   GAME OVER
========================================================= */

function endGame() {

    gameOver = true;

    running = false;


    const finalDistance =
        Math.floor(distance);


    if (
        finalDistance >
        bestScore
    ) {

        bestScore =
            finalDistance;


        try {

            localStorage.setItem(
                "carGameBest",
                bestScore
            );

        } catch (error) { }

    }


    document.getElementById(
        "best"
    ).textContent =
        bestScore +
        " m";


    document.getElementById(
        "finalScore"
    ).textContent =

        "Distance: " +
        finalDistance +
        " m | Coins: " +
        coinScore;


    document.getElementById(
        "gameOver"
    ).classList.add(
        "show"
    );


    playCrashSound();

}


/* =========================================================
   RESTART
========================================================= */

function restartGame() {

    traffic = [];

    coins = [];

    particles = [];


    running = true;

    gameOver = false;


    distance = 0;

    coinScore = 0;

    level = 1;

    roadOffset = 0;

    dayNight = 0;


    spawnTimer =
        0.5;

    coinTimer =
        2;


    player.lane =
        2;


    player.x =
        getLaneX(
            2,
            player.width
        );


    player.targetX =
        player.x;


    player.shield =
        false;


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


/* =========================================================
   PAUSE
========================================================= */

function togglePause() {

    if (
        gameOver
    ) {

        return;

    }


    running =
        !running;


    document.getElementById(
        "pauseBtn"
    ).textContent =
        running
            ? "PAUSE"
            : "RESUME";


    lastTime =
        performance.now();

}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (

            event.key ===
            "ArrowLeft"

            ||

            event.key.toLowerCase() ===
            "a"

        ) {

            event.preventDefault();

            movePlayer(-1);

        }


        if (

            event.key ===
            "ArrowRight"

            ||

            event.key.toLowerCase() ===
            "d"

        ) {

            event.preventDefault();

            movePlayer(1);

        }


        if (
            event.code ===
            "Space"
        ) {

            event.preventDefault();

            togglePause();

        }

    }
);


/* =========================================================
   BUTTONS
========================================================= */

document.getElementById(
    "leftBtn"
).addEventListener(
    "click",
    () => movePlayer(-1)
);


document.getElementById(
    "rightBtn"
).addEventListener(
    "click",
    () => movePlayer(1)
);


document.getElementById(
    "pauseBtn"
).addEventListener(
    "click",
    togglePause
);


document.getElementById(
    "restartBtn"
).addEventListener(
    "click",
    restartGame
);


/* =========================================================
   PHONE / TOUCH CONTROLS
========================================================= */

canvas.addEventListener(
    "pointerdown",
    function (event) {

        const rect =
            canvas.getBoundingClientRect();


        const x =
            event.clientX -
            rect.left;


        /*
           Tap left half = move left.
           Tap right half = move right.
        */

        if (
            x <
            rect.width / 2
        ) {

            movePlayer(-1);

        }

        else {

            movePlayer(1);

        }

    }
);


/* =========================================================
   SOUND
========================================================= */

let audioContext = null;


function getAudio() {

    if (
        !soundEnabled
    ) {

        return null;

    }


    if (
        !audioContext
    ) {

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

    }


    return audioContext;

}


function playCoinSound() {

    const audio =
        getAudio();


    if (
        !audio
    ) {

        return;

    }


    const oscillator =
        audio.createOscillator();


    const gain =
        audio.createGain();


    oscillator.frequency.value =
        900;


    gain.gain.value =
        0.08;


    oscillator.connect(
        gain
    );


    gain.connect(
        audio.destination
    );


    oscillator.start();


    oscillator.stop(
        audio.currentTime +
        0.08
    );

}


function playCrashSound() {

    const audio =
        getAudio();


    if (
        !audio
    ) {

        return;

    }


    const oscillator =
        audio.createOscillator();


    const gain =
        audio.createGain();


    oscillator.type =
        "sawtooth";


    oscillator.frequency.value =
        80;


    gain.gain.value =
        0.15;


    oscillator.connect(
        gain
    );


    gain.connect(
        audio.destination
    );


    oscillator.start();


    oscillator.frequency.exponentialRampToValueAtTime(

        30,

        audio.currentTime +
        0.4

    );


    gain.gain.exponentialRampToValueAtTime(

        0.001,

        audio.currentTime +
        0.4

    );


    oscillator.stop(
        audio.currentTime +
        0.4
    );

}


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(currentTime) {

    const deltaTime =
        Math.min(

            0.04,

            (
                currentTime -
                lastTime
            ) / 1000

        );


    lastTime =
        currentTime;


    update(
        deltaTime
    );


    draw();


    requestAnimationFrame(
        gameLoop
    );

}


/* =========================================================
   START
========================================================= */

requestAnimationFrame(
    gameLoop
);