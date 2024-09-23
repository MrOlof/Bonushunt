// Firebase configuration and initialization (reuse your correct config here)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-firestore.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCMTlO67kX31ar42qyMu1uObePZcJ3rXUk",
  authDomain: "bonushunt-37493.firebaseapp.com",
  projectId: "bonushunt-37493",
  storageBucket: "bonushunt-37493.appspot.com",
  messagingSenderId: "12087076819",
  appId: "1:12087076819:web:56de76ba911c5dd87c3126"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get the huntId from the URL
const params = new URLSearchParams(window.location.search);
const huntId = params.get('huntId');

let bonuses = [];
let totalBonuses = 0;
let totalPlayed = 0;
let totalProfit = 0;
let startAmount = 0;
let currentIndex = 0;

// Fetch the hunt details from Firestore
async function fetchHuntDetails() {
  const docRef = doc(db, "hunts", huntId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const huntData = docSnap.data();
    document.getElementById('huntName').textContent = huntData.name;
    bonuses = huntData.bonuses || [];
    totalBonuses = bonuses.length;
    document.getElementById('totalBonuses').textContent = totalBonuses;
    document.getElementById('remainingBonuses').textContent = totalBonuses - totalPlayed;

    // Populate the bonus list
    bonuses.forEach(bonus => appendBonusToList(bonus));
  } else {
    console.log("No such hunt found!");
  }
}

// Add a bonus function
document.getElementById('addBonusBtn').addEventListener('click', async () => {
  const game = document.getElementById('game').value;
  const betSize = document.getElementById('betSize').value;

  if (game && betSize) {
    const bonus = { game, betSize };

    // Update Firestore with the new bonus
    const docRef = doc(db, "hunts", huntId);
    await updateDoc(docRef, {
      bonuses: arrayUnion(bonus)
    });

    appendBonusToList(bonus);  // Add bonus to UI
    bonuses.push(bonus);       // Update local array
    totalBonuses = bonuses.length;
    document.getElementById('totalBonuses').textContent = totalBonuses;
    document.getElementById('remainingBonuses').textContent = totalBonuses - totalPlayed;
  } else {
    alert("Please enter both game name and bet size.");
  }
});

// Function to append a bonus to the list
function appendBonusToList(bonus) {
  const li = document.createElement('li');
  li.textContent = `Game: ${bonus.game}, Bet Size: ${bonus.betSize}`;
  const removeBtn = document.createElement('button');
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener('click', () => removeBonus(bonus));
  li.appendChild(removeBtn);
  document.getElementById('bonusList').appendChild(li);
}

// Remove bonus function
function removeBonus(bonusToRemove) {
  bonuses = bonuses.filter(bonus => bonus !== bonusToRemove);
  totalBonuses = bonuses.length;
  document.getElementById('bonusList').innerHTML = '';
  bonuses.forEach(bonus => appendBonusToList(bonus));
  document.getElementById('totalBonuses').textContent = totalBonuses;
  document.getElementById('remainingBonuses').textContent = totalBonuses - totalPlayed;
}

// Start the Hunt function
document.getElementById('startHuntBtn').addEventListener('click', () => {
  startAmount = parseFloat(document.getElementById('startAmount').value);

  if (startAmount && totalBonuses > 0) {
    document.getElementById('addPhase').style.display = 'none';
    document.getElementById('huntPhase').classList.add('active');
    showNextGame();
  } else {
    alert("Please add some bonuses and enter a start amount.");
  }
});

// Show the next game in the hunt
function showNextGame() {
  if (currentIndex >= bonuses.length) {
    // Handle hunt completion
    document.querySelector('.progress').innerHTML = "<span class='hunt-complete-message'>Hunt Complete! 🎉</span>";
    document.getElementById('nextGameBtn').style.display = 'none';
    
    // Hide the input field and game details when the hunt is complete
    document.getElementById('gamePlaySection').style.display = 'none';
    
    // Show the "Create New Hunt" button
    document.getElementById('newHuntBtn').style.display = 'block';
    
    return;
  }

  const currentBonus = bonuses[currentIndex];
  document.getElementById('currentGameName').textContent = currentBonus.game;
  document.getElementById('currentBetSize').textContent = currentBonus.betSize;
  document.getElementById('currentGameResult').value = '';
}

// When clicking "Next Game", calculate and update statistics
document.getElementById('nextGameBtn').addEventListener('click', () => {
  const result = parseFloat(document.getElementById('currentGameResult').value);
  const currentBonus = bonuses[currentIndex];

  if (isNaN(result)) {
    alert('Please enter a valid result.');
    return;
  }

  const multiplier = result / currentBonus.betSize;
  totalProfit += result;
  currentBonus.result = result;
  currentBonus.multiplier = multiplier;
  totalPlayed++;

  const avgMultiplier = bonuses.reduce((acc, bonus) => acc + (bonus.multiplier || 0), 0) / totalPlayed;
  const remainingBonuses = totalBonuses - totalPlayed;
  
  // Calculate the sum of remaining bets
  const remainingBetsSum = bonuses.slice(currentIndex + 1).reduce((acc, bonus) => acc + parseFloat(bonus.betSize), 0);
  
  // Calculate the Break-Even X Needed
  let breakEvenX = remainingBetsSum > 0 ? (startAmount - totalProfit) / remainingBetsSum : 'N/A';
  if (breakEvenX < 0) {
    breakEvenX = 0; // If break-even X is negative, display 0.
  }

  // Update the stats in the UI
  document.getElementById('avgMultiplier').textContent = avgMultiplier.toFixed(2);
  const totalProfitLoss = (totalProfit - startAmount).toFixed(2);
  document.getElementById('totalProfit').textContent = totalProfitLoss;
  document.getElementById('totalProfit').style.color = totalProfitLoss >= 0 ? 'green' : 'red';
  document.getElementById('breakEvenX').textContent = isFinite(breakEvenX) ? breakEvenX.toFixed(2) : 'N/A';

  // Update progress and remaining bonuses
  document.querySelector('.progress').textContent = `${totalPlayed} out of ${totalBonuses} bonuses played, ${remainingBonuses} remain`;

  // Update and display the scoreboard
  updateScoreboard();

  currentIndex++;
  showNextGame();
});

// Create New Hunt button functionality
document.getElementById('newHuntBtn').addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Update scoreboard based on multiplier
function updateScoreboard() {
  // Sort the bonuses by multiplier in descending order
  const sortedBonuses = [...bonuses].sort((a, b) => (b.multiplier || 0) - (a.multiplier || 0));

  // Display the sorted bonuses on the scoreboard
  const scoreboard = document.getElementById('scoreboard');
  scoreboard.innerHTML = '';  // Clear the previous scoreboard
  sortedBonuses.forEach((bonus, index) => {
    if (bonus.multiplier !== undefined) {
      const li = document.createElement('li');
      li.textContent = `#${index + 1}: Game: ${bonus.game}, Bet Size: ${bonus.betSize}, Multiplier: ${bonus.multiplier.toFixed(2)}`;
      scoreboard.appendChild(li);
    }
  });
}

// Call the function to fetch hunt details on page load
fetchHuntDetails();
