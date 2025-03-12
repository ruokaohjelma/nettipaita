const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const images = {
    sweater: new Image(),
    spots: [],
    hyvin: new Image(),
    leftHand: new Image(),
    rightHand: new Image(),
};

images.sweater.src = 'paita.png'; // Paita kuva (314x315 px)
images.hyvin.src = 'hyvin.png'; // Hyvin kuva (x2 skaalattuna)
images.leftHand.src = 'vasenkasi.png'; // Vasemman käden kuva
images.rightHand.src = 'oikeakasi.png'; // Oikean käden kuva

for (let i = 1; i <= 6; i++) {
    const img = new Image();
    img.src = `${i}.png`; // Käytetään täpliä 1-6
    images.spots.push(img);
}

const sounds = {
    pop: new Audio('pois.wav'), // Poistaminen ääni
    horn: new Audio('torvi.wav'), // Torvi ääni
};

const sweater = {
    x: canvas.width / 2 - 157, // Paita keskellä (314px leveä)
    y: canvas.height / 2 - 157, // Paita keskellä (315px korkea)
    width: 314, // Paita leveys
    height: 315, // Paita korkeus
    spots: [],
    spotAreaWidth: 160, // Täplä alueen leveys
    spotAreaHeight: 210, // Täplä alueen korkeus
};

// Kädet, jotka roikkuvat olkapäistä
const hands = {
    left: {
        x: sweater.x + 20, // Vasemman käden sijainti (vasemmalla paidasta)
        y: sweater.y - 80, // Vasemman käden sijainti (olkapää)
        width: 70, // Käden leveys
        height: 120, // Käden korkeus
    },
    right: {
        x: sweater.x + sweater.width - 100, // Oikean käden sijainti (oikealla paidasta)
        y: sweater.y - 90, // Oikean käden sijainti (olkapää)
        width: 70, // Käden leveys
        height: 120, // Käden korkeus
    },
};

let removedSpots = 0; // Poistettujen täplien laskuri
let isGameOver = false; // Seurataan, onko peli loppunut
let addSpotInterval; // Täplän lisäys interval
let showHyvin = false; // Tarkistaa, onko hyvin.png esillä
let level = 1; // Peli alkaa tasolta 1
let spotFrequency = 2000; // Täplän ilmestymisväli ensimmäisellä kierroksella
let requiredSpots = 6; // Poistettavat täplät ensimmäisellä kierroksella

let handSwingAngle = 0; // Käden heilumiskulma
const handSwingSpeed = 0.05; // Heilumisnopeus
const handSwingAmplitude = 15; // Heilumisen amplitudi (käden liikkumisen laajuus)

// Piirretään paita (lisätty liike)
function drawSweater() {
    const sweaterX = sweater.x + Math.sin(handSwingAngle) * handSwingAmplitude * 0.5; // Paita liikkuu hieman käden mukana
    const sweaterY = sweater.y + Math.cos(handSwingAngle) * handSwingAmplitude * 0.5; // Paita liikkuu hieman käden mukana
    ctx.drawImage(images.sweater, sweaterX, sweaterY, sweater.width, sweater.height);
}

// Piirretään kädet paidan olkapäistä
function drawHands() {
    handSwingAngle += handSwingSpeed; // Lasketaan käden heilumiskulma

    // Vasemman käden liikuttaminen
    const leftHandX = hands.left.x + Math.sin(handSwingAngle) * handSwingAmplitude;
    const leftHandY = hands.left.y + Math.cos(handSwingAngle) * handSwingAmplitude;
    ctx.drawImage(images.leftHand, leftHandX, leftHandY, hands.left.width, hands.left.height);

    // Oikean käden liikuttaminen
    const rightHandX = hands.right.x + Math.sin(handSwingAngle + Math.PI) * handSwingAmplitude; // Lisätään pi
    const rightHandY = hands.right.y + Math.cos(handSwingAngle + Math.PI) * handSwingAmplitude; // Lisätään pi
    ctx.drawImage(images.rightHand, rightHandX, rightHandY, hands.right.width, hands.right.height);
}

// Lisätään täplä satunnaiseen paikkaan paidan keskitetylle alueelle
function addSpot() {
    if (isGameOver || showHyvin) return; // Ei lisätä täpliä, jos peli on päättynyt tai hyvin.png on näkyvillä

    let spotX, spotY, spotImage;

    // Päivitetään täpläalueen sijainti niin, että se on keskitetty ja siirretty 30px vasemmalle
    const areaX = sweater.x + (sweater.width - sweater.spotAreaWidth) / 2 - 30; // Täpläalueen vasen reuna siirretty 30px vasemmalle
    const areaY = sweater.y + (sweater.height - sweater.spotAreaHeight) / 2; // Täpläalueen yläreuna keskitetty

    // Varmistetaan, että täplä ilmestyy vain rajatulle alueelle
    spotX = areaX + Math.random() * sweater.spotAreaWidth; // Paikka rajatulla alueella (leveys)
    spotY = areaY + Math.random() * sweater.spotAreaHeight; // Paikka rajatulla alueella (korkeus)

    // Valitaan satunnainen täplä (1-6)
    spotImage = images.spots[Math.floor(Math.random() * 6)];

    // Lisätään täplä listaan
    sweater.spots.push({ x: spotX, y: spotY, image: spotImage });
}

// Piirretään täplät käyttäen nearest neighbor skaalausta
function drawSpots() {
    sweater.spots.forEach(spot => {
        ctx.imageSmoothingEnabled = false; // Estetään liukuminen (nearest neighbor)
        
        // Täplät liikkuvat hieman käden liikkeen mukana
        const spotX = spot.x + Math.sin(handSwingAngle) * handSwingAmplitude * 0.3;
        const spotY = spot.y + Math.cos(handSwingAngle) * handSwingAmplitude * 0.3;
        
        ctx.drawImage(spot.image, spotX, spotY, 20, 20); // Täplä piirretään 20x20 px
    });
}

// Hiiren tai sormen liikkeen käsittely (poistetaan täplä, jos kursori/sormi menee sen päälle)
function handleMove(event) {
    // Estetään oletustapahtumat (mobiililaitteilla, kuten zoomaus ja sivun vieritys)
    event.preventDefault();

    let mouseX, mouseY;

    if (event.type === 'mousemove') {
        // Hiiren tapahtuma
        mouseX = event.clientX;
        mouseY = event.clientY;
    } else if (event.type === 'touchmove') {
        // Kosketustapahtuma
        const touch = event.touches[0]; // Oletetaan, että käytetään vain yhtä sormea
        mouseX = touch.clientX;
        mouseY = touch.clientY;
    }

    // Tarkistetaan osuuko kursori/sormi täplään
    sweater.spots = sweater.spots.filter(spot => {
        const dist = Math.hypot(spot.x + 10 - mouseX, spot.y + 10 - mouseY); // Täplän keskipisteen etäisyys
        if (dist <= 10) { // Jos kursori/sormi osuu täplään
            sounds.pop.play(); // Soitetaan pois.wav ääni
            removedSpots++; // Kasvatetaan poistettujen täplien määrä
            return false; // Poistetaan täplä
        }
        return true;
    });

    // Jos poistettu tarvittava määrä täpliä, näytetään hyvin.png ja soitetaan torvi.wav
    if (removedSpots === requiredSpots && !showHyvin) {
        sounds.horn.play(); // Soitetaan torvi.wav
        showHyvin = true; // Näytetään hyvin.png
        setTimeout(resetGame, 3000); // Odotetaan 3 sekuntia ennen pelin aloitusta uudelleen
    }
}

// Kosketustapahtumien kuuntelu
canvas.addEventListener('mousemove', handleMove); // Hiiren liikkumisen kuuntelu
canvas.addEventListener('touchmove', handleMove, { passive: false }); // Kosketusliikkeen kuuntelu

// Kosketustapahtuman aloitus (touchstart) kosketuksessa
canvas.addEventListener('touchstart', function(event) {
    // Kosketuksen aloitus, ehkä voimme myös käsitellä sen samalla tavalla kuin 'mousemove' jos halutaan lisätä sormeen kosketus ja tehdä se alusta asti
    handleMove(event);
}, { passive: false });

// Näytetään hyvin.png keskellä ja skaalattuna 2x
function showHyvinImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Tyhjennetään canvas
    ctx.drawImage(images.hyvin, canvas.width / 2 - (images.hyvin.width * 2) / 2, canvas.height / 2 - (images.hyvin.height * 2) / 2, images.hyvin.width * 2, images.hyvin.height * 2); 
}

// Pelin resetointi
function resetGame() {
    removedSpots = 0; // Poistettujen täplien laskuri
    sweater.spots = []; // Tyhjennetään täplälistaus
    showHyvin = false; // Piilotetaan hyvin.png
    isGameOver = false; // Pelin lopetus pois
    level = 1; // Peli aloittaa ensimmäiseltä tasolta
    addSpotInterval = setInterval(addSpot, spotFrequency); // Täplän lisäys interval
    requiredSpots = 6; // Poistettavat täplät
    spotFrequency = 2000; // Täplän ilmestymisväli ensimmäisellä kierroksella
}

// Alustetaan peli
function startGame() {
    // Käynnistetään täplän ilmestymisintervalleja
    addSpotInterval = setInterval(addSpot, spotFrequency);
}

// Pelin käynnistys
startGame();
